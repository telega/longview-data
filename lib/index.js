'use strict';
var async = require('async');
var request = require('request');
var pretty = require('prettysize');
var colors = require('colors/safe');

function getUptime(seconds) {
	var d = Math.floor(seconds / 86400);
	var h = Math.floor((seconds % 86400) / 3600);
	var m = Math.floor(((seconds % 86400) % 3600) / 60);
	return d + ' days, ' + h + ':' + m;
}

function getBitsPerSec(bytes) {
	var b = 8 * bytes;
	if (b >= 1000000000) {
		return (b / 1000000000).toFixed(1) + ' Gb/s';
	} else if (b >= 1000000) {
		return (b / 1000000).toFixed(1) + ' Mb/s';
	} else if (b >= 1000) {
		return (b / 1000).toFixed(1) + ' Kb/s';
	}
	return b.toFixed(0) + ' b/s';
}

function setColors(color) {
	colors.setTheme({
		title: [color, 'bold'],
		label: ['bold']
	});
}

var buildRequestArray = function () {
	var ra = '[{"api_action":"lastUpdated"},{"api_action":"getLatestValue","keys":["SysInfo.hostname","SysInfo.cpu.type","SysInfo.os.*","CPU.*","Load.*","Memory.*","Uptime","Disk.*","Network.Interface.*"]}]';
	return ra;
};
var buildLongview = function (data) {
	var d = JSON.parse(data);
	var lv = {};
	var key;
	lv.lastUpdated = d[0].DATA.updated;
	// Basic System Info
	lv.hostname = d[1].DATA.SysInfo.hostname;
	lv.dist = d[1].DATA.SysInfo.os.dist;
	lv.distversion = d[1].DATA.SysInfo.os.distversion;
	lv.uptime = getUptime(d[1].DATA.Uptime);
	lv.cpuType = d[1].DATA.SysInfo.cpu.type;
	// Memory
	lv.realMem = pretty(1024 * parseFloat(d[1].DATA.Memory.real.used[0].y + d[1].DATA.Memory.real.free[0].y));
	lv.realMemUsed = pretty(1024 * parseFloat(d[1].DATA.Memory.real.used[0].y));
	lv.realMemUsedPercent = 100 * (1024 * parseFloat(d[1].DATA.Memory.real.used[0].y)) / (1024 * parseFloat(d[1].DATA.Memory.real.used[0].y + d[1].DATA.Memory.real.free[0].y));
	// Disks
	var dsk = {};
	// Filter only disks on /dev/sd* or we get mounted shares etc
	for (key in d[1].DATA.Disk) {
		if (/\/dev\/sd*/g.test(key)) {
					// Make sure it has an fs property
			if ({}.hasOwnProperty.call(d[1].DATA.Disk[key], 'fs')) {
				dsk[key] = d[1].DATA.Disk[key];
			}
		}
	}
	lv.fsTotal = Object.keys(dsk).reduce(function (total, key) {
		return total + parseFloat(dsk[key].fs.total[0].y);
	}, 0);
	lv.fsFree = Object.keys(dsk).reduce(function (total, key) {
		return total + parseFloat(dsk[key].fs.free[0].y);
	}, 0);
	lv.fsUsed = lv.fsTotal - lv.fsFree;
	lv.fsUsedPercent = (100 * (lv.fsUsed / lv.fsTotal)).toFixed(1);
	lv.fsUsed = pretty(lv.fsUsed);
	lv.fsTotal = pretty(lv.fsTotal);
	lv.fsFree = pretty(lv.fsFree);
	// CPU
	lv.load = (d[1].DATA.Load[0].y).toFixed(2);
	lv.cpuSystem = 0;
	lv.cpuWait = 0;
	lv.cpuUser = 0;
	for (key in d[1].DATA.CPU) {
		if ({}.hasOwnProperty.call(d[1].DATA.CPU, key)) {
			lv.cpuSystem += d[1].DATA.CPU[key].system[0].y;
			lv.cpuWait += d[1].DATA.CPU[key].wait[0].y;
			lv.cpuUser += d[1].DATA.CPU[key].user[0].y;
		}
	}
	lv.cpuTotal = (lv.cpuSystem + lv.cpuWait + lv.cpuUser).toFixed(1);
	// Network
	lv.rxBytes = 0;
	lv.txBytes = 0;
	for (key in d[1].DATA.Network.Interface) {
		if ({}.hasOwnProperty.call(d[1].DATA.Network.Interface, key)) {
			lv.rxBytes += d[1].DATA.Network.Interface[key].rx_bytes[0].y;
			lv.txBytes += d[1].DATA.Network.Interface[key].tx_bytes[0].y;
		}
	}
	return lv;
};

var printLongview = function (longviews, flags) {
	// Sort LVs by hostname
	longviews.sort(function (a, b) {
		if (a.hostname < b.hostname) {
			return -1;
		}
		if (a.hostname > b.hostname) {
			return 1;
		}
		return 0;
	});

	if (flags.j) {
		console.log(JSON.stringify(longviews));
	} else {
		longviews.forEach(function (lv) {
			console.log(colors.title(lv.hostname));
			console.log(colors.label('Distro: ') + lv.dist + ' ' + lv.distversion);
			console.log(colors.label('Uptime: ') + lv.uptime);
			console.log(colors.label('CPU: ') + lv.cpuType);
			console.log(colors.label('CPU Usage: ') + lv.cpuTotal + '%' + colors.label(' Load: ') + lv.load);
			console.log(colors.label('Memory: ') + lv.realMemUsed + ' / ' + lv.realMem + ' (' + lv.realMemUsedPercent.toFixed(1) + ' %)');
			console.log(colors.label('Disk: ') + lv.fsUsed + ' / ' + lv.fsTotal + ' (' + lv.fsUsedPercent + ' %)');
			console.log(colors.label('Network In: ') + getBitsPerSec(lv.rxBytes) + colors.label(' Out: ') + getBitsPerSec(lv.txBytes));
		});
	}
};

module.exports = function (keys, flags, callback) {
	var options = {};
	var longviews = [];
	var calls = [];

	try {
		if (flags.f) {
			options = require('./config.json');
		} else if (keys.length > 0) {
			console.log('keys:' + keys);
			options = {
				apiKeys: keys,
				color: 'green'
			};
		} else {
			throw new Error('No Longview API Key provided - check config.json?');
		}
	} catch (err) {
		console.log('Error: ' + err.message);
		callback(err);
	}
	setColors(options.color);
	options.apiKeys.forEach(function (key) {
		calls.push(function (callback) {
			var requestOptions = {
				method: 'POST',
				url: 'https://longview.linode.com/fetch',
				headers: {
					'content-type': 'application/x-www-form-urlencoded'
				},
				form: {
					api_key: key,
					api_action: 'batch',
					api_requestArray: buildRequestArray()
				}
			};

			request(requestOptions, function (error, response, body) {
				if (error) {
					return callback(error);
				}
				longviews.push(buildLongview(body));
				callback(null);
			});
		});
	});

	async.parallel(calls, function (err) {
		if (err) {
			return console.log(err);
		}

		printLongview(longviews, flags);
		callback(longviews);
	});
};
