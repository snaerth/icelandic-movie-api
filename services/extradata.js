"use strict";
var config = require('../config/api');
var HttpService = require('./httpservice');
var FileService = require('./fileservice');
var movieObject = require('../models/moviemodels');
var request = require('request');
var logger = require('./logservice');
var utils = require('../utils/utils');
var path = require('path');
var q = require('q');
var extraImageService = require('./extraimageservice');
var DBService = require('./dbservice');
var _underscore = require('underscore');

/**
 * The movie database limits 30 request per 10 second
 * So we split movies into chunks if movie list is greater than 30 movies
 * For each chunk we request extra data from services for each movie in chunk 
 * --------------------------------------------------------------------------
 * @param {obj} films 
 * @param {string} filepath to save
 * @param {string} extraImagePath to pass to next service
 * @param {bool} isShowtimes check if films are from showtimes path from kvikmyndir.is
 * @param {string} collectionName for database
 * @param {function} callback to run when all extra services have finished
 */
var getData = function (films, filepath, extraImagePath, isShowtimes, collectionName, callback) {
    var maxLength = 30;
    if(films.length > maxLength) {
        var tempMovies = [];
        var arr = utils.splitToChunks(films, maxLength);
        for(var i = 0; i < arr.length; i++)  {
            (function(i) {
                setTimeout(function() {
                    if(arr.length - 1 !== i) {
                        getExtraFromServices(arr[i], filepath, function(films) {
                            if(films) {
                                tempMovies.push(films);    
                            }
                        });
                    } else {
                        // if last chunk of movies
                        // Get extra data from services
                        getExtraFromServices(arr[i], filepath, function(films) {
                            if(films) {
                                tempMovies.push(films);    
                            }
                            var mergedFilms = [];
                            for(var i = 0; i < tempMovies.length; i++) {
                                for(var j = 0; j < tempMovies[i].length; j++) {+
                                    mergedFilms.push(tempMovies[i][j]);    
                                }
                            }
                            inserFilmsToServices(mergedFilms, filepath, extraImagePath, isShowtimes, collectionName, callback)
                        });
                    } 
                }, (i + 1) * 15000); // Set the request limit to 15 seconds to be sure
            }(i));
        }       
    } else {
        getExtraFromServices(films, filepath, function(films) {
            inserFilmsToServices(films, filepath, extraImagePath, isShowtimes, collectionName, callback);
        });
    }
}

/**
 * Gets extra information from external services.
 * Attaches infomation to corresponding film object
 * When done run callback function to notify next func 
 * ----------------------------------------------------
 * @param {obj} films 
 * @param {string} filepath to save
 * @param {function} callback to run when all extra services have finished
 */
var getExtraFromServices = function(films, filepath, callback) {
    var promises = [];
    films.forEach(function (film, i) {
        // if showtimes is empty then remove from films
        if(film.showtimes && film.showtimes.length === 0) {
            films.splice(i,1);
        }
        if (film.certificateIS) {
            film.certificateExtra = utils.certificateExtra(film.certificateIS);
        }
        film.trailers = [];
        film.omdb = [];

        var imdbid = film.ids.imdb;
        if (imdbid) {
            //------------------------------------- 
            // Get youtube information for trailers from moviedb
            //-------------------------------------
            promises.push(HttpService.getContent(config.themoviedburl + 'tt' + imdbid + '/videos?api_key=' + config.themoviedbkey).then(function (data) {
                film.trailers.push(JSON.parse(data));
            }).catch(function (err) {
                logger.error().info('Error getting ' + film.title + ' from youtube, ErrorMessage : ' + err);
            }));
                        
            //------------------------------------- 
            // Get plot from kvikmyndir.is
            //-------------------------------------
            promises.push(HttpService.getContent(config.kvikmyndirimdbid + imdbid + '&key=' + config.kvikmyndirkey).then(function (data) {
                var result = JSON.parse(data);
                if (result.plot) {
                    film.plot = result.plot;
                }
                if (!film.poster) {
                    film.poster = result.poster;
                }
            }).catch(function (err) {
                logger.error().info('Error getting ' + film.title + ' from' + config.kvikmyndirimdbid + imdbid + ', ErrorMessage : ' + err);
            }));
            
            //------------------------
            // Get omdbapi information
            //------------------------
            promises.push(HttpService.getContent(config.omodburl + '?i=tt' + imdbid + '&plot=true&tomatoes=true&r=json').then(function (data) {
                var result = JSON.parse(data);
                if (Boolean(result.Response) === true) {
                    film.omdb.push(result);
                    if (film.certificateIS === "") {
                        film.certificateIS = utils.certificateExtra(film.omdb[0].Rated);
                    }
                }
            }).catch(function (err) {
                logger.error().info('Error getting ' + film.title + ' from omdb, ErrorMessage : ' + err);
            }));
        }
    });
    
    //---------------------------------------------
    // When all requests have finished run callback
    //---------------------------------------------
    Promise.all(promises).then(function (data) {
        callback(films);
    });
}

/**
 * Deep trims every property in films array
 * Saves films to json filepath
 * Inserts films to database
 * Initializes extra image service for all the films
 * -------------------------------------------------
 * @param {obj} films 
 * @param {string} filepath to save
 * @param {string} extraImagePath to pass to next service
 * @param {bool} isShowtimes check if films are from showtimes path from kvikmyndir.is
 * @param {string} collectionName for database
 * @param {function} callback to run when all extra services have finished
 */
var inserFilmsToServices = function(films, filepath, extraImagePath, isShowtimes, collectionName, callback) {
    utils.DeepTrim(films);
    FileService.writeToJson(films, filepath);
    if(isShowtimes) {
        // Insert movies into all movies collection
        DBService.insertDocument(films, 'allmovies', function (err, result) {
            if (err) logger.databaseError().info('Error inserting document to database, Error: ' + err);
        });
    }
    // Insert films into database
    DBService.insertDocument(films, collectionName, function (err, result) {
        if (err) logger.databaseError().info('Error inserting document to database, Error: ' + err);
    });

    setTimeout(function () {
        extraImageService(films, extraImagePath, 'extraimages', callback ? callback : null);
    }, 1000 * 15); // Because of moviedb request limit is 30 requests per 10 second*/
}

/**
 * Intialize main service for extra data
 */
var extraData = {
    addExtraToMovies: function (films, filepath, extraImagePath, isShowtimes, collectionName, callback) {
        getData(films, filepath, extraImagePath, isShowtimes, collectionName, callback);
    }
};

module.exports = extraData;
