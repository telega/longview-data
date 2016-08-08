'use strict';
var async = require('async');
var request = require('request');
var pretty = require('prettysize');
var colors = require('colors');

var buildRequestArray = function (flags) {
	var ra = '[{"api_action":"lastUpdated"},{"api_action":"getLatestValue","keys":["SysInfo.hostname","SysInfo.os.*","Memory.*","Uptime","Disk.*"]}]';
	return ra;
};

function getUptime(seconds) {
	var d = Math.floor(seconds / 86400);
	var h = Math.floor((seconds % 86400) / 3600);
	var m = Math.floor(((seconds % 86400) % 3600) / 60);
	return d + ' days, ' + h + ':' + m;
}

var buildLongview = function (data, flags) {
	var d = JSON.parse(data);
	var lv = {};
	lv.lastUpdated = d[0].DATA.updated;
	// Basic System Info
	lv.hostname = d[1].DATA.SysInfo.hostname;
	lv.dist = d[1].DATA.SysInfo.os.dist;
	lv.distversion = d[1].DATA.SysInfo.os.distversion;
	lv.uptime = getUptime(d[1].DATA.Uptime);
	// Memory
	lv.realMem = pretty(1024 * parseFloat(d[1].DATA.Memory.real.used[0].y + d[1].DATA.Memory.real.free[0].y));
	lv.realMemUsed = pretty(1024 * parseFloat(d[1].DATA.Memory.real.used[0].y));
	lv.realMemUsedPercent = 100 * (1024 * parseFloat(d[1].DATA.Memory.real.used[0].y)) / (1024 * parseFloat(d[1].DATA.Memory.real.used[0].y + d[1].DATA.Memory.real.free[0].y));
	// Disks
	var dsk = {};
	// Filter only disks on /dev/sd* or we get mounted shares etc
	for (var key in d[1].DATA.Disk) {
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

	return lv;
};

var printLongview = function (longviews) {
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

	longviews.forEach(function (lv) {
		console.log(lv.hostname.green.bold);
		console.log('Distro: '.bold + lv.dist + ' ' + lv.distversion);
		console.log('Uptime: '.bold + lv.uptime);
		console.log('Memory: '.bold + lv.realMemUsed + ' / ' + lv.realMem + ' (' + lv.realMemUsedPercent.toFixed(1) + ' %)');
		console.log('Disk: '.bold + lv.fsUsed + ' / ' + lv.fsTotal + ' (' + lv.fsUsedPercent + ' %)');
	});
};

module.exports = function (keys, flags) {
	var options = {
		apiKeys: keys
	};
	var longviews = [];
	var calls = [];

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
					api_requestArray: buildRequestArray(flags)
				}
			};

			request(requestOptions, function (error, response, body) {
				if (error) {
					return callback(error);
				}
				longviews.push(buildLongview(body, flags));
				callback(null);
			});
		});
	});

	async.parallel(calls, function (err) {
		if (err) {
			return console.log(err);
		}
		printLongview(longviews);
		return longviews;
	});
};
