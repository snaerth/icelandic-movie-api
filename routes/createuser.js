"use strict";
var express = require('express');
var fs = require('fs-extra');
var DBService = require('../services/dbservice');
var mailService = require('../services/mailservice');
var config = require('../config/api');
var utils = require('../utils/utils');
var _underscore = require('underscore');
var mongodb = require('mongodb');
var flash = require('connect-flash');
var logger = require('../services/logservice');
var userModel = require('../models/user');

// =====================================
// CREATE USER ==============================
// =====================================
module.exports = function(passport) {
    var router = express.Router();
    // Route for domain/createuser
    router
        // show the CREATE USER form
        .get('/', isLoggedIn, function(req, res) {
            var err = req.flash('errors'),
                postParams = req.flash('postParams'),
                msg = req.flash('msg');
            // render the page and pass in any flash data if it exists
            res.render('createuser', { 
                errors: err.length > 0 ? err : false, 
                msg: msg.length > 0 ? msg : false, 
                postParams :  postParams.length > 0 ? postParams : false,
            }); 
        })
        
        // Handle post requests from both contact and API form
        .post('/', isLoggedIn, function(req, res, next) {
            var errors = {},
                postParams = {},
                hasError = false,
                user = userModel();
            for (var key in req.body) {
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
                        } else {
                            user[key] = utils.generateHash(req.body[key]);
                        }
                    }
                    else if (_underscore.isEmpty(req.body[key]) && key !== 'process') {
                        errors[key] = key + " is required";
                        hasError = true;
                    } else {
                        if(key === 'active' || key === 'globaladmin' || key === 'admin') { 
                            if(req.body[key] === 'on') {
                                user[key] = true;
                            }
                        } else {
                            user[key] = req.body[key];
                        }
                     }
                    // Add to user object
                    postParams[key] = req.body[key];
                }
            }
            if (!hasError) {
                user.username = user.username.toLowerCase();
                // CREATE USER API key form
                req.flash('msg', '<h2>Thank you</h2><p>User ' + user.username + ' created.</p>');
                // Create user in database
                DBService.insertAny(user, 'users', function(err, document) {
                    if (err) {
                        logger.databaseError().info('Error creating user ' + user.username + ', Error: ' + err);
                    } else {
                        if (user) {
                            var userHeader = "<h1>" + document.ops[0].username + " was created in database</h1>";
                            var userTable = utils.createHtmlTableFromObjectProperty(document.ops[0]);
                            mailService.sendMail('snaerth@gmail.com', 'snaerth@gmail.com', document.ops[0].fullname + " created in users collection in database", '', userHeader + userTable);
                        }
                    }
                });
            } else {
                req.flash('postParams', postParams);
                req.flash('errors', errors);
            }
            res.redirect('/createuser');
        });
    return router;
}


// ====================================================================================================
// ==================================== LOGIN HELPERS =================================================
// ====================================================================================================
// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    req.session.returnTo = '/createuser';
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated() && req.user.globaladmin) {
        return next();
    } 
    res.redirect('/login');
}



