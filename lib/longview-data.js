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

longviewData(cli.input, cli.flags);
