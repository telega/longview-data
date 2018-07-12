#!/usr/bin/env node
'use strict';
const meow = require('meow');
const longviewData = require('./');
const cli = meow([
	'Usage',
	'  $ longview-data [Longview API Key]',
	'',
	'Options',
	'  -f  Use config.json to provide API keys',
	'  -t  Output as a table',
	'  -j  Output as JSON',
	'  -r  Do not process the response.',
	'',
	'Examples',
	'  $ longview-data XXXXXXX-XXXXX-XXXXXX',
	'  MyLinode',
	'  Distro: Ubuntu 16.04',
	'  Uptime: 9 days, 18:33',
	'  CPU: Intel(R) Xeon(R) CPU E5-2680 v3 @ 2.50GHz',
	'  CPU Usage: 0.2% Load: 0.00',
	'  Memory: 992.4 MB / 3.9 GB (25.1 %)',
	'  Disk: 4.6 GB / 47 GB (9.7 %)',
	'  Network In: 404 b/s Out: 521 b/s'
]);

var colors = require('colors/safe');
var Table = require('cli-table3');

function setColors(color) {
	colors.setTheme({
		title: [color, 'bold'],
		label: ['bold'],
		warn: ['yellow']
	});
}

function printTable(longviews) {
	longviews.forEach(function (lv) {
		var table = new Table();
		table.push(
			[{colSpan: 3, hAlign: 'center', content: colors.title(lv.hostname)}],
			['Distro', lv.dist, lv.distversion],
			['Uptime', {colSpan: 2, content: lv.uptime}],
			[' ', 'Usage', 'Load'],
			['CPU', lv.cpuTotal, lv.load],
			['Memory', 'Used', 'Total'],
			['RAM', lv.realMemUsed, lv.realMem],
			['Disk', lv.fsUsed, lv.fsTotal]
			);
		console.log(table.toString());
	});
}

var printLongview = function (longviews, flags) {
	setColors('rainbow');
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

	if (flags.j || flags.r) {
		console.log(JSON.stringify(longviews));
	} else if (flags.t) {
		printTable(longviews);
	} else {
		longviews.forEach(function (lv) {
			console.log(colors.title(lv.hostname));
			// warn if the longview hasn't updated in a while
			if ({}.hasOwnProperty.call(lv, 'lastUpdated') && (lv.lastUpdated !== 0)) {
				console.log(colors.warn(lv.lastUpdated));
			}
			console.log(colors.label('Distro: ') + lv.dist + ' ' + lv.distversion);
			console.log(colors.label('Uptime: ') + lv.uptime);
			console.log(colors.label('Available Updates: ') + lv.packageUpdates);
			console.log(colors.label('CPU: ') + lv.cpuType);
			console.log(colors.label('CPU Usage: ') + lv.cpuTotal + colors.label(' Load: ') + lv.load);
			console.log(colors.label('Memory: ') + lv.realMemUsed + ' / ' + lv.realMem + ' (' + lv.realMemUsedPercent + ')');
			console.log(colors.label('Disk: ') + lv.fsUsed + ' / ' + lv.fsTotal + ' (' + lv.fsUsedPercent + ')');
			console.log(colors.label('Network In: ') + lv.rxBytes + colors.label(' Out: ') + lv.txBytes);
		});
	}
};

longviewData(cli.input, cli.flags, function (err, data) {
	if (err) {
		console.log(err);
		return;
	}
	printLongview(data, cli.flags);
});
