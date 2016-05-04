"use strict";
var config = require('../config/api');
var HttpService = require('./httpservice');
var FileService = require('./fileservice');
var movieObject = require('../models/moviemodels');
var cheerio = require('cheerio');
var logger = require('./logservice');
var utils = require('../utils/utils');
var path = require('path');
var extraImageService = require('./extraimageservice');
var DBService = require('./dbservice');

/**
 * Bio Paradís Movie Scraper
 * Scapes bioparadis.is and constucts movie object from data
 * @param {date} dateNow format DD-MM-YYYY
 * @param {servicesStates} object holding services state values
 * @author : Snær Seljan Þóroddsson
 */
var bioParadisScraper = function (callback) {
    HttpService.getContent(config.paradisurl).then(function (data) {
        var films = [];
        var $ = cheerio.load(data, { decodeEntities: false });
        
        // Scrape front page and get minumum movie information
        $('.shows ul li a').each(function (i, el) {
            // Create empty object 
            var film = movieObject();
            // Fill object with data
            $(this).parent('li').find('ul.timar li').each(function (j, el) {
                film.showtimes[0].schedule.push($(el).contents().first().text());
            });
            film.href = $(this).attr('href');
            var title = $(this).find('h4').text();
            if (title.indexOf('/') > -1) {
                film.title = title.substring(0, title.indexOf('/')).trim();
            } else {
                film.title = title.trim();
            }
            film.poster = $(this).find('.poster img').attr('data-src');
            film.showtimes[0].cinema = 12;
            films.push(film);
        });

        var promises = [];
        films.forEach(function (film, i) {
            if (film.href !== undefined) {
                promises.push(HttpService.getContent(film.href).then(function (data) {
                    var $ = cheerio.load(data);
                    film.extraimage.push($('.cover').find('img').attr('src'));
                    film.id = $('.cover').attr('data-id');
                    film.alternativeTitles = film.title;
                    // CertificateIS/Rated
                    film.certificateIS = $('.aldurstakmark').find('p').text();
                    if (film.certificateIS) {
                        film.certificateExtra = utils.certificateExtra(film.certificateIS);
                    }
                    // Actors
                    var actors = $('ul.details').children().last().find('span').attr('itemprop', 'actors').find('span');
                    if (actors.length > 0) {
                        $('ul.details').children().last().find('span').attr('itemprop', 'actors').find('span').each(function (i, actor) {
                            film.actors_abridged.push({name : $(actor).text().trim()});
                        });
                    }
                    
                    // Rest of information
                    $('ul.details li').each(function (i, el) {
                        // Year
                        if ($(el).text().indexOf('Ár') > -1) {
                            var year = $(el).text().split(":");
                            film.year = year[year.length - 1].trim();
                        }
                        // Director
                        if ($(el).text().trim().toLowerCase().indexOf('leikstjóri') > -1) {
                            var director = $(el).text().trim().split(":");
                            var directors = director[director.length - 1].split(',');
                            for(var i = 0; i < directors.length;i++) {
                                film.directors_abridged.push({
                                    name : directors[i]
                                });
                            }
                        }
                        // Writers
                        if ($(el).text().trim().toLowerCase().indexOf('handritshöfundur') > -1) {
                            var writer = $(el).text().trim().split(":");
                            var writers = writer[writer.length - 1].split(',');
                            for(var i = 0; i < writers.length;i++) {
                                film.writers_abridged.push({
                                    name : writers[i]
                                });
                            }
                        }
                        // Duration minutes
                        if ($(el).text().toLowerCase().indexOf('lengd') > -1) {
                            var min = $(el).text().split(":");
                            film.durationMinutes = parseInt(min[min.length - 1].trim().replace(/\D/g, ''));
                        }
                        // Genres 
                        if ($(el).text().toLowerCase().indexOf('tegund') > -1) {
                            var genres = $(el).text().trim().split(":");
                            film.genres = genres[genres.length - 1].split(/,|-/);
                        }
                        // Country
                        if ($(el).text().trim().toLowerCase().indexOf('land:') > -1) {
                            var country = $(el).text().trim().split(":");
                            film.country = country[country.length - 1].split(',');
                        }
                        // Release date
                        if ($(el).text().trim().toLowerCase().indexOf('frumsýnd') > -1) {
                            var release = $(el).text().trim().split(":");
                            film.releaseDate = release[release.length - 1];
                        }
                        // Language
                        if ($(el).text().trim().toLowerCase().indexOf('tungumál') > -1) {
                            var language = $(el).text().trim().split(":");
                            film.language = language[language.length - 1];
                        }
                    });
                    
                    film.plot = $("div.content").html(); 
                }).catch(function (err) {
                    logger.error().info('Error getting movie ' + film.title + ' : ' + err);
                }));
            }
        });

        Promise.all(promises).then(function (data) {
            // Adds extra to each film
            setExtraData(films, callback);
        });

    }).catch(function (err) {
        logger.error().info('Error: ' + err);
    });
}

/**
 * Gets extra information from external services.
 * Attaches infomation to corresponding film object
 * When done deep trims every property in films array
 * Saves films to json filepath
 * Inserts films to database
 * Initializes extra image service for all the films
 * -------------------------------------------------
 * @param {obj} films 
 */
var setExtraData = function (films, callback) {
    var promises = [];
    films.forEach(function (film) {
        //------------------------ 
        // Get omdbapi information
        //------------------------
        promises.push(HttpService.getContent(config.omodburl + '?t=' + film.title.trim() + '&y=' + film.year + '&plot=true&tomatoes=true&r=json').then(function (data) {
            var result = JSON.parse(data);
            if (Boolean(result.Response) === true) {
                film.omdb.push(result);
                if (film.certificateIS === "") {
                    film.certificateIS = utils.certificateExtra(film.omdb[0].Rated);
                }
            }
            var imdbid = result.imdbID;
            if (imdbid !== undefined) {
                return HttpService.getContent(config.themoviedburl + imdbid + '/videos?api_key=' + config.themoviedbkey);
            }
        }).then(function (data) {
            if (data !== undefined) {
                film.trailers.push(JSON.parse(data));
            }
        }).catch(function (err) {
            logger.error().info('Error getting ' + film.title + ' from omdb, ErrorMessage : ' + err);
        }));
    });
    
    //--------------------------------
    // When all promises have finished
    //--------------------------------
    Promise.all(promises).then(function (data) {
        utils.DeepTrim(films);
        FileService.writeToJson(films, config.paradisfilepath, function (err) {
            if (err) {
                logger.error().info('Error saving file ' + config.paradisfilepath + ' , ErrorMessage : ' + err);
            } else {
                // Merge files
                FileService.mergeJsonFiles(config.showtimesfilepath,config.paradisfilepath,config.allmoviesfilepath);

                // Insert into movies in theaters now
                DBService.insertDocument(films, 'movies', function (err, result) {
                    if (err) logger.databaseError().info('Error inserting document to database, Error: ' + err);
                });
                // Save extra image to json
                setTimeout(function () {
                    extraImageService(films, config.extraImages, 'extraimages', callback);
                }, 1000 * 10); // Because of moviedb request limit is 30 requests per 10 second
            }
        });
    });
};


var scraper = {
    /**
     * Date format converter
     * Converts new Date() obj to DD-MM-YYYY
     * @param {date} inputFormat
     * @returns {string} format DD-MM-YYYY
     */
    convertDate: function (inputFormat) {
        function pad(s) { return (s < 10) ? '0' + s : s; }
        var d = new Date(inputFormat);
        return [pad(d.getDate()), pad(d.getMonth() + 1), d.getFullYear()].join('-');
    },
    /**
     * Intialize scraper
     */
    init: function (callback) {
        bioParadisScraper(callback);
    }
};

module.exports = scraper;
