"use strict";
var express = require('express');
var fs = require('fs-extra');
var DBService = require('../services/dbservice');
var mailService = require('../services/mailservice');
var config = require('../config/api');
var emailConfig = require('../config/email');
var tokenConfig = require('../config/config');
var utils = require('../utils/utils');
var _underscore = require('underscore');
var mongodb = require('mongodb');
var flash = require('connect-flash');
var logger = require('../services/logservice');
var userModel = require('../models/user');
var jwt    = require('jsonwebtoken');

// =====================================
// INDEX AND WEB API RESPONSES =========
// =====================================
module.exports = function(passport) {
    var router = express.Router();
    // Route for domain/
    router
        // Index
        .get('/', function(req, res, next) {
            var err = req.flash('errors'),
                msg = req.flash('msg'),
                user = req.user;
            if (err.length > 0) {
                var postParams = req.flash('postParams');
                res.render('index', { 
                    errors: err, 
                    msg: false, 
                    postParams: postParams, 
                    user : user ? user : false 
                });
            } else if (err.length === 0 && msg.length > 0) {
                res.render('index', { 
                    errors: false, 
                    msg: msg, 
                    postParams: false,
                    user : user ? user : false 
                });
            } else {
                res.render('index', { 
                    errors: false, 
                    msg: false, 
                    postParams: false,
                    user : user ? user : false
                });
            }
        })

        // =====================================
        // POST index ==========================
        // =====================================
        // Handle post requests from both contact and register form
        .post('/', function(req, res, next) {
            var errors = {},
                postParams = {},
                hasError = false,
                user = userModel();
                user.active = true;
            for (var key in req.body) {
                var keyName = key.substring(key.indexOf('_') + 1, key.length).toLowerCase();
                if (req.body.hasOwnProperty(key)) {
                    // Error handling
                    if (key.toLowerCase().indexOf('email') > -1) {
                        user.email = req.body[key];
                        if (!utils.validateEmail(req.body[key])) {
                            errors[key] = "Please enter a valid email address";
                            hasError = true;
                        }
                    }
                    else if (key.toLowerCase().indexOf('password') > -1) {
                        if (req.body[key].length < 6) {
                            errors[key] = "Password must at least be 6 characters long";
                            hasError = true;
                        }
                    }
                    else if (_underscore.isEmpty(req.body[key]) && key !== 'process' && key !== 'contactform') {
                        errors[key] = keyName + " is required";
                        hasError = true;
                    }

                    // Add to user object
                    if (keyName.indexOf('username') > -1 || keyName.indexOf('password') > -1 || keyName.indexOf('name') > -1 || keyName.indexOf('message') > -1 || keyName.indexOf('domain') > -1) {
                        if(keyName.indexOf('password') > -1) {
                            user[keyName] = utils.generateHash(req.body[key]);
                        } else {
                            user[keyName] = req.body[key];
                        }
                    }

                    // Post params
                    if (key !== 'contactform') {
                        postParams[key] = req.body[key];
                    }
                }
            }
            if (!hasError) {
                // Contact form
                if (req.body.hasOwnProperty('contactform')) {
                    var headerHtml = '<h1>Contact form</h1>';
                    var tableHtml = utils.createHtmlTableFromObjectProperty(postParams);
                    req.flash('msg', '<h2>Thank you</h2><p>I will be in touch as soon as possible</p>');
                    mailService.sendMail(user.email, 'snaerth@gmail.com', "IMA Contact form", '', headerHtml + tableHtml);
                }
                // API key form
                else {
                    user.username = user.username.toLowerCase();
                    req.flash('msg', '<h2>Thank you</h2><p>' + user.username + ' account has been activated. Please use it responsibly.</p>');
                    // Create user in database
                    DBService.insertAny(user, 'users', function(err, document) {
                        if (err) {
                            logger.databaseError().info('Error creating user ' + user.username + ', Error: ' + err);
                        } else {
                            if (user) {
                                var userHeader = "<h1>" + document.ops[0].username + " was created in database</h1>";
                                var userTable = utils.createHtmlTableFromObjectProperty(document.ops[0]);
                                // Send email to me
                                mailService.sendMail(emailConfig.email, emailConfig.email, "Application for user " + document.ops[0].fullname, '', userHeader + userTable);
                            }
                        }
                    });
                }
            } else {
                req.flash('postParams', postParams);
                req.flash('errors', errors);
            }
            res.redirect('/');
        })
        
        // =====================================
        // WEB API RESPONSES ===================
        // =====================================
        
        
        // movies 
        .get('/movies', tokenAuthentication, function(req, res, next) {
            queryMovies(req, res, next, 'movies0', config.dataBasePath + '/movies0.json');    
        })
        
        // movies by date
        // Where 0 is today and 1 is tomorrow
        // Days to get are between 0 and 4. Four being the maximum
        // This is only for global admins
        .get('/movies-by-dates/:id', tokenAuthentication, function(req, res, next) {
            var day = req.params.id;
            if(day < 5) {
                queryMovies(req, res, next, 'movies' + day, config.dataBasePath + '/movies' + day +' .json');    
            } else {
                res.json({
                    error: true,
                    message : 'Movies by date limit is between 0-4'
                });
            }
        })

        // images 
        .get('/images', tokenAuthentication, function(req, res, next) {
            queryImages(req, res, next, 'extraimages', config.extraImages);
        })
        
        // upcoming
        .get('/upcoming', tokenAuthentication, function(req, res, next) {
            queryMovies(req, res, next, 'upcoming', config.upcommingfilepath);
        })

        // theaters 
        .get('/theaters', tokenAuthentication, function(req, res, next) {
            readAndResponse(config.theatersfilepath, res, req);
        })
        
        // genres 
        .get('/genres', tokenAuthentication, function(req, res, next) {
            readAndResponse(config.genresfilepath, res, req);
        });
    return router;
}

// ====================================================================================================
// ==================================== LOGIN HELPERS =================================================
// ====================================================================================================
// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    req.session.returnTo = '/';
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated()) {
        return next();
    } 
    res.redirect('/login');
}

// route middleware to authenticate token from request
function tokenAuthentication(req, res, next) {
    // Check if token exists in request 
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (token) {
        // Decode token, verifies secret and checks if token has expired
        jwt.verify(token, tokenConfig.secret, function(err, decoded) {
            if (err) {
                return res.json({ 
                    success: false, 
                    message: 'Failed to authenticate token.', 
                    error: err
                });
            } else {
                if(req.path.indexOf("movies-by-date") > -1 ) {
                    if(decoded.admin) {
                        // if everything is good, save to request for use in other routes
                        req.decoded = decoded;
                        next();
                    } else {
                        // return an error
                        return res.status(403).send({
                            success: false,
                            message: 'This route is for admin only'
                        });
                    }
                } else {
                    // if everything is good, save to request for use in other routes
                    req.decoded = decoded;
                    next();
                }
            }
        });
    } else {
        // if there is no token
        // return an error
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
}


// ====================================================================================================
// ==================================== FILTERING AND RESPONSES =======================================
// ====================================================================================================
/**
* Querys from database
* @param {req} request from route
* @param {res} response from route
* @param {err} err from route
* @param {collection} collection name
* @param {filepath} filepath to pass to renderResponse func
* @author : Snær Seljan Þóroddsson
* */
var queryMovies = function(req, res, next, collection, filePath) {
    // Display all movies from db
    if (_underscore._.isEmpty(req.query)) {
        DBService.findDocument(null, collection, function(err, docs) {
            renderResponse(req, res, err, docs, null, readAndResponse, filePath);
        });
    }
    // Query from DB after title
    else if (req.query.title) {
        DBService.findDocuments({ "title": new RegExp(req.query.title, 'i') }, collection, function(err, docs) {
            if (err) {
                renderResponse(req, res, err, null, req.query.title, readAndResponse, filePath);
            } else {
                renderResponse(req, res, err, docs, req.query.title);
            }
        });
    }
    // Query from DB after imdbid 
    else if (req.query.imdbid) {
        var imdbid = req.query.imdbid;
        if (imdbid.substring(0, 2) === "tt") {
            var imdbidNumberOnly = imdbid.substring(2, imdbid.length);
        }
        DBService.findDocument({ $or: [{ "ids.imdb": new RegExp(imdbidNumberOnly ? imdbidNumberOnly : imdbid) }, { "omdb.imdbID": imdbid }] }, collection, function(err, docs) {
            if (err) {
                renderResponse(req, res, err, null, req.query.imdbid, readAndResponse, filePath);
            } else {
                renderResponse(req, res, err, docs, imdbid);
            }
        });
    }
    // Query from DB after imdb rating
    else if (req.query.imdbrating) {
        var rating = req.query.imdbrating;
        DBService.findDocuments({ "ratings.imdb": { $gt: rating } }, collection, function(err, docs) {
            if (err) {
                renderResponse(req, res, err, null, rating, readAndResponse, filePath);
            } else {
                renderResponse(req, res, err, docs, rating);
            }
        });
    }
    // Query from DB after showtime
    else if (req.query.showtime) {
        DBService.findDocuments({ showtimes: { $elemMatch: { schedule: new RegExp(req.query.showtime, 'i') } } }, collection, function(err, docs) {
            if (err) {
                renderResponse(req, res, err, null, req.query.showtime, readAndResponse, filePath);
            } else {
                renderResponse(req, res, err, docs, req.query.showtime);
            }
        });
    }
    // Query from DB after certificate
    else if (req.query.certificate) {
        DBService.findDocuments({ "certificateExtra.number": new RegExp(req.query.certificate, 'i') }, collection, function(err, docs) {
            if (err) {
                renderResponse(req, res, err, null, req.query.certificate, readAndResponse, filePath);
            } else {
                renderResponse(req, res, err, docs, req.query.certificate);
            }
        });
    }
    // Query from DB after actors
    else if (req.query.actor) {
        DBService.findDocuments({ "actors_abridged.name": new RegExp(req.query.actor, 'i') }, collection, function(err, docs) {
            if (err) {
                renderResponse(req, res, err, null, req.query.actor, readAndResponse, filePath);
            } else {
                renderResponse(req, res, err, docs, req.query.actor);
            }
        });
    }
    // Query from DB after director
    else if (req.query.director) {
        DBService.findDocuments({ "directors_abridged.name": new RegExp(req.query.director, 'i') }, collection, function(err, docs) {
            if (err) {
                renderResponse(req, res, err, null, req.query.director, readAndResponse, filePath);
            } else {
                renderResponse(req, res, err, docs, req.query.director);
            }
        });
    }
    // Query from DB after mongodb uniq id
    else if (req.query.mongoid) {
        var o_id = new mongodb.ObjectID(req.query.mongoid);
        DBService.findDocument({ '_id': o_id }, collection, function(err, docs) {
            renderResponse(req, res, err, docs, req.query.mongoid);
        });
    }
    // If all query params are empty the return all movies
    else {
        DBService.findDocument(null, collection, function(err, docs) {
            renderResponse(req, res, err, docs, null, readAndResponse, filePath);
        });
    }
}

/**
* Querys images from database
* @param {req} request from route
* @param {res} response from route
* @param {err} err from route
* @param {collection} collection name
* @param {filepath} filepath to pass to renderResponse func
* @author : Snær Seljan Þóroddsson
* */
var queryImages = function(req, res, next, collection, filePath) {
    // Display all images from db
    if (_underscore._.isEmpty(req.query)) {
        DBService.findDocument(null, collection, function(err, docs) {
            renderResponse(req, res, err, docs, null, readAndResponse, filePath);
        });
    }
    // Query images from DB after imdbid 
    else if (req.query.imdbid) {
        var imdbid = req.query.imdbid;
        if (imdbid.substring(0, 2) === "tt") {
            var imdbidNumberOnly = imdbid.substring(2, imdbid.length);
        }
        DBService.findDocument({ "imdbid": new RegExp(imdbidNumberOnly ? imdbidNumberOnly : imdbid) }, collection, function(err, docs) {
            if (err) {
                renderResponse(req, res, err, null, imdbid, readAndResponse, filePath);
            } else {
                renderResponse(req, res, err, docs, imdbid);
            }
        });
    }
    // If all query params are empty then display all images from db
    else {
        DBService.findDocument(null, collection, function(err, docs) {
            renderResponse(req, res, err, docs, null, readAndResponse, filePath);
        });
    }
}

/**
* Renders json from file to page and filters it by query param
* @param {path} filepath to read
* @param {res} response from route
* @param {err} err from route
* @param {next} continue to next route
* @author : Snær Seljan Þóroddsson
* */
function readAndResponse(path, res, req, next) {
    fs.readFile(path, function(err, data) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        if (err) {
            res.send('Error reading file, Error: ' + err);
        } else {
            var query = req.query;
            if (_underscore._.isEmpty(query)) {
                res.send(data);
            }
            else {
                // Filter movies from query string 
                var filteredArray = [], data = JSON.parse(data);
                // Filter title
                if (query.title) {
                    data.filter(function(movie) {
                        if (movie.title.toLowerCase().indexOf(query.title.toLowerCase()) > -1) {
                            filteredArray.push(movie);
                        }
                    });
                }
                // Filter imdb id
                else if (query.imdbid) {
                    var imdbid = query.imdbid;
                    if (imdbid.substring(0, 2) === "tt") {
                        var imdbidNumberOnly = imdbid.substring(2, imdbid.length);
                    }
                    data.filter(function(movie) {
                        if (movie.ids) {
                            var id = movie.ids.imdb ? movie.ids.imdb : null;
                            if (id && id.indexOf(imdbidNumberOnly ? imdbidNumberOnly : imdbid) > -1) {
                                filteredArray.push(movie);
                            }
                        }
                        // Query for /images?imdbid 
                        else if (movie.imdbid) {
                            var id = movie.imdbid;
                            if (id && id.indexOf(imdbidNumberOnly ? imdbidNumberOnly : imdbid) > -1) {
                                filteredArray.push(movie);
                            }
                        }
                    });
                }
                // Filter imdb rating
                // Show all movies that
                // have bigger rating 
                // than query number
                else if (query.imdbrating) {
                    var number = parseFloat(query.imdbrating);
                    data.filter(function(movie) {
                        if (movie.omdb && movie.omdb[0]) {
                            var movieRating = movie.omdb[0].imdbRating ? parseFloat(movie.omdb[0].imdbRating) : null;
                            if (movieRating >= number) {
                                filteredArray.push(movie);
                            }
                        }
                        else if (movie.ratings) {
                            var movieRating = movie.ratings.imdb ? parseFloat(movie.ratings.imdb) : null;
                            if (movieRating >= number) {
                                filteredArray.push(movie);
                            }
                        }
                    });
                }
                // Filter showtime
                else if (query.showtime) {
                    data.filter(function(movie) {
                        var match = false;
                        movie.showtimes.forEach(function(theater) {
                            theater.schedule.forEach(function(time) {
                                if (time.indexOf(query.showtime) > -1) {
                                    match = true;
                                }
                            });
                        });
                        if (match) {
                            filteredArray.push(movie);
                        }
                        match = false;
                    });
                }
                // Filter certificate
                else if (query.certificate) {
                    data.filter(function(movie) {
                        if (movie.certificateExtra &&
                            movie.certificateExtra.number &&
                            movie.certificateExtra.number.toLowerCase() === query.certificate.toLowerCase()) {
                            filteredArray.push(movie);
                        }
                    });
                }
                // Filter actor
                else if (query.actor) {
                    data.filter(function(movie) {
                        var match = false;
                        if (movie.actors_abridged) {
                            movie.actors_abridged.forEach(function(actor) {
                                if (actor.name.toLowerCase().indexOf(query.actor.toLowerCase()) > -1) {
                                    match = true;
                                }
                            });
                        }
                        if (match) {
                            filteredArray.push(movie);
                        }
                        match = false;
                    });
                }
                // Filter director
                else if (query.director) {
                    var match = false;
                    data.filter(function(movie) {
                        if (movie.directors_abridged) {
                            movie.directors_abridged.forEach(function(director) {
                                if (director.name.toLowerCase().indexOf(query.director.toLowerCase()) > -1) {
                                    match = true;
                                }
                            });
                        }
                        if (match) {
                            filteredArray.push(movie);
                        }
                        match = false;
                    });
                }
                // Let know that mongo id is not possible
                else if (query.mongoid) {
                    filteredArray.push({
                        "Error": "Mongoid not found",
                        "Message": "Mongoid is not filterable from filesystem. It's only filterable from database"
                    });
                }

                // Send to response filtered movies array 
                // or all movies 
                if (filteredArray.length > 0) {
                    res.send(JSON.stringify(filteredArray));
                } else {
                    res.send(JSON.stringify(filteredArray));
                }

            }
        }
    });
}

/**
* Renders json response from database
* @param {res} response from database
* @param {err} err return from database
* @param {docs} documents returned from database
* @param {queryparam} query param in query string
* @param {callback} callback function
* @param {filePath} filePath if callback function is provided
* @author : Snær Seljan Þóroddsson
* */
function renderResponse(req, res, err, docs, queryparam, callback, filePath) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', 'application/json');
    // If db returns error, read from json file instead
    if (err || (docs && docs.length === 0)) {
        if (!callback) {
            res.send({
                "Message": queryparam + " not found"
            });
        } else {
            callback(filePath, res, req);
        }
    } else {
        res.json(docs);
    }
}


