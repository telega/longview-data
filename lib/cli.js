#!/usr/bin/env node
'use strict';
const meow = require('meow');
const longviewData = require('./');

const cli = meow([
	'Usage',
	'  $ longview-data [input]',
	'',
	'Options',
	'  --foo  Lorem ipsum. [Default: false]',
	'',
	'Examples',
	'  $ longview-data',
	'  unicorns',
	'  $ longview-data rainbows',
	'  unicorns & rainbows'
]);

longviewData(cli.input, cli.flags);
