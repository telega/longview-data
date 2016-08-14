'use strict';
var async = require('async');
var request = require('request');
var pretty = require('prettysize');

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

function convertTime(ts) {
	var date = new Date(ts);
	var year = date.getFullYear();
	var month = date.getMonth();
	var day = date.getDate();
	var hour = date.getHours();
	var min = date.getMinutes();
	var time = year + '-' + month + '-' + day + ' ' + hour + ':' + min;
	return time;
}

var buildRequestArray = function () {
	var ra = '[{"api_action":"lastUpdated"},{"api_action":"getLatestValue","keys":["SysInfo.hostname","SysInfo.cpu.type","SysInfo.os.*","CPU.*","Load.*","Memory.*","Uptime","Disk.*","Network.Interface.*"]}]';
	return ra;
};

function checkResponse(body) {
	var d = JSON.parse(body);
	// basic check of data recieved from Linode. Maybe use a schema?
	if ({}.hasOwnProperty.call(d, '0') && {}.hasOwnProperty.call(d, '1')) {
		if ({}.hasOwnProperty.call(d[0].DATA, 'updated') && {}.hasOwnProperty.call(d[1].DATA, 'Memory') && {}.hasOwnProperty.call(d[1].DATA, 'Uptime') && {}.hasOwnProperty.call(d[1].DATA, 'Disk') && {}.hasOwnProperty.call(d[1].DATA, 'Load') && {}.hasOwnProperty.call(d[1].DATA, 'CPU')) {
			return true;
		}
		return false;
	}
	return false;
}

function buildLongview(d) {
	var lv = {
		lastUpdated: 0,
		hostname: '0',
		dist: 0,
		distversion: 0,
		uptime: 0,
		cpuType: 0,
		realMem: 0,
		realMemUsed: 0,
		realMemUsedPercent: 0,
		fsTotal: 0,
		fsUsed: 0,
		fsUsedPercent: 0,
		fsFree: 0,
		cpuTotal: 0,
		rxBytes: 0,
		txBytes: 0
	};
	var key;

	// if it hasnt been updated in 2 hours add a key for warnings
	if (d[0].DATA.updated + 7200 < Math.floor((new Date()).getTime() / 1000)) {
		lv.lastUpdated = 'Last Updated: ' + convertTime(1000 * d[0].DATA.updated);
	}
	// Basic System Info
	lv.hostname = d[1].DATA.SysInfo.hostname;
	lv.dist = d[1].DATA.SysInfo.os.dist;
	lv.distversion = d[1].DATA.SysInfo.os.distversion;
	lv.uptime = getUptime(d[1].DATA.Uptime);
	lv.cpuType = d[1].DATA.SysInfo.cpu.type;
	// Memory
	lv.realMem = pretty(1024 * parseFloat(d[1].DATA.Memory.real.used[0].y + d[1].DATA.Memory.real.free[0].y));
	lv.realMemUsed = pretty(1024 * parseFloat(d[1].DATA.Memory.real.used[0].y));
	lv.realMemUsedPercent = (100 * (1024 * parseFloat(d[1].DATA.Memory.real.used[0].y)) / (1024 * parseFloat(d[1].DATA.Memory.real.used[0].y + d[1].DATA.Memory.real.free[0].y))).toFixed(1) + '%';
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
	lv.fsUsedPercent = (100 * (lv.fsUsed / lv.fsTotal)).toFixed(1) + '%';
	lv.fsUsed = pretty(lv.fsUsed);
	lv.fsTotal = pretty(lv.fsTotal);
	lv.fsFree = pretty(lv.fsFree);
	// CPU
	lv.load = (d[1].DATA.Load[0].y).toFixed(2);
	var cpuSystem = 0;
	var cpuWait = 0;
	var cpuUser = 0;
	for (key in d[1].DATA.CPU) {
		if ({}.hasOwnProperty.call(d[1].DATA.CPU, key)) {
			cpuSystem += d[1].DATA.CPU[key].system[0].y;
			cpuWait += d[1].DATA.CPU[key].wait[0].y;
			cpuUser += d[1].DATA.CPU[key].user[0].y;
		}
	}
	lv.cpuTotal = (cpuSystem + cpuWait + cpuUser).toFixed(1) + '%';
	// Network
	lv.rxBytes = 0;
	lv.txBytes = 0;
	for (key in d[1].DATA.Network.Interface) {
		if ({}.hasOwnProperty.call(d[1].DATA.Network.Interface, key)) {
			lv.rxBytes += d[1].DATA.Network.Interface[key].rx_bytes[0].y;
			lv.txBytes += d[1].DATA.Network.Interface[key].tx_bytes[0].y;
		}
	}
	lv.rxBytes = getBitsPerSec(lv.rxBytes);
	lv.txBytes = getBitsPerSec(lv.txBytes);
	return lv;
}

module.exports = function (keys, flags, callback) {
	var options = {};
	var longviews = [];
	var calls = [];

	try {
		if (flags.f) {
			options = require('./config.json');
		} else if (keys.length > 0) {
			options = {
				apiKeys: keys,
				color: 'green'
			};
		} else {
			throw new Error('No Longview API Key provided - check config.json?');
		}
	} catch (error) {
		callback(error);
	}
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
					return console.log(error);
				}
				if (!checkResponse(body)) {
					return callback('Error: Linode Response missing data');
				}
				longviews.push(buildLongview(JSON.parse(body)));
				callback();
			});
		});
	});
	async.parallel(calls, function (error) {
		callback(error, longviews);
	});
};
