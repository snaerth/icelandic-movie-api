"use strict";
var fs = require('fs-extra');
var bunyan = require('bunyan');
var request = require('request');
var path = require('path');
var HttpService = require('./httpservice');
var logger = require('./logservice');
var config = require('../config/api');
var q = require('q');

/**
 * File services
 * */
var fileservice = {
    /**
    * Writes data to json file
    * @param {data} data to write to json
    * @param {path} path to json on file system
    * @param {callback} callback function to run if defined
    * @author : Snær Seljan Þóroddsson
    * */
    writeToJson: function (data, path, callback) {
        fs.writeJson(path, data, function (err) {
            if (err) {
                logger.error().info('Error saving file: ' + err);
            } else {
                if (callback) {
                    callback();
                }
            }
        });
    },
    
    /**
     * Reads json file
     * @param {path} path to json on file system
     * @param {callback} callback function to run if defined
     * @author : Snær Seljan Þóroddsson
     * */
    readFromJson: function (path, callback) {
        fs.readFile(path, 'utf8', function (err, data) {
            if (err) {
                logger.error().info('Error reading file: ' + err);
            } else {
                if (callback) {
                    callback(data);
                }
            }
        });
    },
    
    /**
     * Merges two JSON objects into one
     * @param {path1} path to json on file system
     * @param {path2} path to json on file system
     * @author : Snær Seljan Þóroddsson
     * */
    mergeJsonFiles: function (path1, path2, newFilePath) {
        fileservice.readFromJson(path1, function (data) {
            var newData = JSON.parse(data);
            fileservice.readFromJson(path2, function (data) {
                var otherData = JSON.parse(data)
                for (var i = 0; i < otherData.length; i++) {
                    newData.push(otherData[i]);
                }
                fileservice.writeToJson(newData, newFilePath);
            });
        });
    },
    
    /**
    * Saves image to filesystem
    * @param {data} data to write to json
    * @param {path} path to json on file system
    * @author : Snær Seljan Þóroddsson
    * */
    writeImgToFS: function (data, path, callback) {
        var deferred = q.defer();
        fs.writeFile(path, data, 'binary', function (err) {
            if (err) {
                deferred.reject(err);
                logger.error().info('Error saving file: ' + err);
            } else {
                callback();
                deferred.resolve(path);
            }
        });
        return deferred.promise;
    },
    
    /**
     * Gets images url path from movies objec
     * And saves images to filesystem. 
     * Then resizes every image and saves resized 
     * images to filesystem. 
     * Then finally adds local paths for
     * images to movies object.
     * @param {movies} array of movies
     * @author : Snær Seljan Þóroddsson
     * */
    saveImagesFromUrl: function (movies) {
        var promises = [];
        for (var i = 0; i < movies.length; i++) {
            movies[i].posterLocal = {
                normal : null
            };
            if (movies[i].poster && movies[i].title) {
                (function(poster, title, i) {
                    var posterPath = './public/posters/' + title.replace(/[\/:*?"<>|]/g, "") + path.extname(poster);
                    promises.push(HttpService.getContentBinary(poster).then(function(data) {
                        return fileservice.writeImgToFS(data,posterPath, function() {
                            var s = posterPath;
                            movies[i].posterLocal.normal = s.substring(s.indexOf('/posters'), s.length);
                        });
                    }).catch(function(error) {
                        logger.error().info('Error requesting file from url : ' + error);
                    }));
                }(movies[i].poster, movies[i].title, i));
                
            }
        }
        Promise.all(promises).then(function(data) {
            console.log('all DONE');
        });
    },

    /**
     * Creates directory in filesystem
     * @param {dirname} string dirname
     * @author : Snær Seljan Þóroddsson
     * */
    createDirectory : function(dirname) {
        if(!fs.existsSync(dirname)) {
            fs.mkdirSync(dirname);
        }
    }
};

module.exports = fileservice;
