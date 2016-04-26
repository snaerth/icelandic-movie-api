"use strict";
var config = require('../config/api');
var HttpService = require('./httpservice');
var FileService = require('./fileservice');
var ExtraData = require('./extradata');
var paradisScraper = require('./paradisscraper');
var logger = require('./logservice');
var DBService = require('./dbservice');
var _underscore = require('underscore');
var fs = require('fs-extra');

/**
 * Initialize services
 * Gathers all information about movies in Icelandic Theaters
 * and saves it to database and to json files
 * @param {callback} callback function to run when all operations have finished
 * @author : Snær Seljan Þóroddsson
 */
var initServices = function(callback) {
    //------------------------------------------
    // Fetch all movies and data for api service
    //------------------------------------------
    // Showtimes and movies
    HttpService.getContent(config.showtimesurl + '?key=' + config.kvikmyndirkey).then(function(data) {
        if (data) {
            var result = JSON.parse(data);
            result.forEach(function(movie) {
                if (movie.showtimes) {
                    movie.showtimes.forEach(function(showtime) {
                        if (showtime.schedule) {
                            showtime.schedule = _underscore._.uniq(showtime.schedule);
                        }
                    });
                }
            });

            // Remove all documents from movies collection
            DBService.removeDocument({}, 'movies', function(err) {
                if (err) {
                    logger.databaseError().info('Error removing all documents from movies collection, Error: ' + err);
                }
                ExtraData.addExtraToMovies(result, config.showtimesfilepath, config.extraImages, true, 'movies', getUpcoming);
            });
        }
    }).catch(function(err) {
        logger.error().info('Error getting url' + config.showtimesurl + ', Error: ' + err);
    });

    // Upcoming movies
    function getUpcoming() {
        setTimeout(function() {
            HttpService.getContent(config.upcommingurl + '&key=' + config.kvikmyndirkey).then(function(data) {
                if (data) {
                    var result = JSON.parse(data);
                    // Remove all documents from upcoming collection
                    DBService.removeDocument({}, 'upcoming', function(err) {
                        if (err) {
                            logger.databaseError().info('Error removing all documents from upcoming collection, Error: ' + err);
                        }
                        ExtraData.addExtraToMovies(result, config.upcommingfilepath, config.extraImages, false, 'upcoming', getBioparadis);
                    });
                }
            }).catch(function(err) {
                logger.error().info('Error getting url' + config.upcommingurl + ', Error: ' + err);
            });
        }, 10000); // Because of moviedb request limit is 30 requests per 10 second
    }

    // Bíó paradís movie scraper
    function getBioparadis() {
        setTimeout(function() {
            paradisScraper.init(callback);
        }, 10000); // Moviedb request limit is 30 requests per 10 second
    }

    // Use this block only if data gets lost or deleted 
    // Get genres from services and write to json file and save data to collection genres
    if (!fs.existsSync(config.genresfilepath)) {
        HttpService.getContent(config.genresurl + '?key=' + config.kvikmyndirkey).then(function(data) {
            if(data) {
                var result = JSON.parse(data);
                FileService.writeToJson(result, config.genresfilepath);
                DBService.insertManyDocument(result, 'genres', function(err, result) {
                    if (err) logger.databaseError().info('Error inserting document genres collection, Error: ' + err);
                });
            }
        }).catch(function(err) {
            logger.error().info('Error getting url' + config.genresurl + ', Error: ' + err);
        });
    }
};

module.exports = initServices;
