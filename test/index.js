'use strict';

var assert = require('assert');
var longviewData = require('../lib');

describe('longview-data', function () {
	it('should return array of longviews', function (done) {
		longviewData('', {f: true}, function (err, result) {
			if (err) {
				console.log(err);
			}
			assert(Array.isArray(result));
			done();
		});
	});
});
