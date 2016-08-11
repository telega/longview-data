'use strict';

var assert = require('assert');
var longviewData = require('../lib');

describe('longview-data', function () {
	it('should return array of longviews', function (done) {
		longviewData('',{ f: true }, function(result){
			assert(Array.isArray(result));	
			done();
		});
		
	});
});
