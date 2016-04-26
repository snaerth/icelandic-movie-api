"use strict";
var q = require('q');
var request = require('request');

/**
 * HTTP request get data from url
 * @param {url} url string
 * @returns {promise} returns promise object
 * @author : Snær Seljan Þóroddsson
 * */
var Service = {
	getContent: function(url) {
		var deferred = q.defer();
		request(url, { timeout: 15000 },function (error, response, body) {
            if (!error && response.statusCode == 200) {
				deferred.resolve(body);
            } else {
                deferred.reject(error);
			}
		});
		return deferred.promise;
	},
    
    getContentBinary : function(url) {
		var deferred = q.defer();
		request.get(url, {encoding : null}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
				deferred.resolve(body);
            } else {
                deferred.reject(error);
			}
		});
		return deferred.promise;
	}
};

module.exports = Service;
