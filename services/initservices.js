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
    
    /**
     * SHOWTIMES AND FUTURE SHOWTIMES
     * Gets showtimes today and future showtimes for the next four days
     * Gathers all information about the movies
     * and saves it to database and to json files
     * @param {maxdays} Count of max days to get (maximum is 4 days)
     * @author : Snær Seljan Þóroddsson
     */
    var getFutureShowtimes = function(day, maxDays) {
        HttpService.getContent(config.kvikmyndirBaseUrl + config.showtimesDate + '/?dagur=' + day + '&key=' + config.kvikmyndirkey).then(function(data) {
            if(data) {
                var result = ShowtimesFixer(JSON.parse(data));
                // Remove all documents from movies collection
                DBService.removeDocument({}, 'movies' + day, function(err) {
                    if (err) {
                        logger.databaseError().info('Error removing all documents from movies' + day + ' collection, Error: ' + err);
                    }
                    if(day <= maxDays) {
                        ExtraData.addExtraToMovies(result, config.dataBasePath + '/movies'+ day + '.json', null, 'movies' + day, function() {
                            setTimeout(function() {
                                getFutureShowtimes(day + 1, maxDays);
                            }, 10000); // Because of moviedb request limit is 30 requests per 10 second 
                        });
                    } else {
                        getUpcoming();
                    }
                });
            } else {
                getUpcoming();
            }
        }).catch(function(err) {
            logger.error().info('Error getting url' + config.showtimesDate + day + ', Error: ' + err);
        });
    };
    
    /**
     * UPCOMING MOVIES
     * Gets upcoming movies coming to cinema
     * Gathers all information about movies
     * and saves it to database and to json files
     * @author : Snær Seljan Þóroddsson
     */
    var getUpcoming = function() {
        setTimeout(function() {
            HttpService.getContent(config.kvikmyndirBaseUrl + config.upcomming + '/?count=100' + '&key=' + config.kvikmyndirkey).then(function(data) {
                if (data) {
                    var result = JSON.parse(data);
                    // Remove all documents from upcoming collection
                    DBService.removeDocument({}, 'upcoming', function(err) {
                        if (err) {
                            logger.databaseError().info('Error removing all documents from upcoming collection, Error: ' + err);
                        }
                        ExtraData.addExtraToMovies(result, config.upcommingfilepath, config.extraImages, 'upcoming', callback);
                    });
                }
            }).catch(function(err) {
                logger.error().info('Error getting url' + config.upcomming + ', Error: ' + err);
            });
        }, 10000); // Because of moviedb request limit is 30 requests per 10 second
    };
    
    // Get genres from services and write to json file 
    // and save data to collection genres
    HttpService.getContent(config.kvikmyndirBaseUrl + config.genres + '?key=' + config.kvikmyndirkey).then(function(data) {
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
    
    // Gets future showtimes from kvikmyndir.is 
    // And add other data from other services
    getFutureShowtimes(0, 4);
};

/**
 * BÍÓ PARADÍS MOVIES SCRAPER
 * Gathers all information about movies in Bíó Paradís
 * and saves it to database and to json files
 * @author : Snær Seljan Þóroddsson
 */
// Bíó paradís movie scraper
var getBioparadis = function() {
    setTimeout(function() {
        HttpService.getContent(config.bioparadisApiUrl + config.bioparadisApiKey).then(function(data) {
            if (data) {
                var result = JSON.parse(data);
            } else {
                paradisScraper.init(callback);
            }
        }).catch(function(err) {
            logger.error().info('Error getting url' + config.bioparadisApiUrl + ', Error: ' + err);
        });
    }, 10000); // Moviedb request limit is 30 requests per 10 second
}

//getBioparadis();

/**
 * Removes all dublicates from showtimes array
 * @param {movies} movies to iterate through
 * @author : Snær Seljan Þóroddsson
 */
function ShowtimesFixer(movies) {
    movies.forEach(function(movie) {
        if (movie.showtimes) {
            movie.showtimes.forEach(function(showtime) {
                if (showtime.schedule) {
                    showtime.schedule = _underscore._.uniq(showtime.schedule);
                }
            });
        }
    });
    return movies;
}

module.exports = initServices;