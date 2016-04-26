"use strict";
var express = require('express');
var fs = require('fs-extra');
var DBService = require('../services/dbservice');
var mailService = require('../services/mailservice');
var config = require('../config/api');
var configDB = require('../config/database');
var utils = require('../utils/utils');
var _underscore = require('underscore');
var mongodb = require('mongodb');
var flash = require('connect-flash');
var logger = require('../services/logservice');
var userModel = require('../models/user');
var ObjectId = require('mongoose').Types.ObjectId;

// =====================================
// USERS ===============================
// =====================================
module.exports = function(passport) {
    var router = express.Router();
    // Route for domain/users
    router
        // show the users site
        .get('/', isLoggedIn, function(req, res) {
            var error = req.flash('errors'),
                msg = req.flash('msg'),
                user = req.user;
            res.render('users', { 
                errors: error.length > 1 ? error : false, 
                msg: false, 
                postParams: false,
                user : user ? user : false,
                userslist : false
            }); 
        })
        
        // Get all users from database
        .get('/users', isLoggedIn, function(req, res) {
            DBService.findDocuments({}, 'users', function(err, users) {
                if(err) {
                    logger.databaseError().info('Error getting users from users collection, Error: ' + err);
                    res.json({
                        success: false,
                        message: 'Error getting users from database, Error message: ' + err
                    });
                } else {
                    res.json(users);
                } 
            }); 
        })
        
        // Get user by id
        .get('/:id', isLoggedIn, function(req, res, next) {
            var id = req.params.id;
            if(ObjectId.isValid(id)) {
                DBService.findOne({ _id: mongodb.ObjectId(id) }, 'users', function(err, user) {
                    if(err) {
                        res.json({
                            success: false,
                            message: 'Error getting user, Error: ' + err
                        });
                    } else {
                        res.json(user);
                    } 
                })
            } else {
                res.json({
                    success: false,
                    message: 'Not a valid Object id'
                });
            }
        })
        
        // Delete user
        .delete('/', isLoggedIn, function (req, res, next) {
            if(req.body.id) {
                var userid = req.body.id;
                if(userid !== configDB.MainGlobalAdminId) {
                    DBService.removeDocument({_id: mongodb.ObjectId(userid)}, 'users', function(err, users) {
                        if(err) {
                            err = "Error deleting user with id " + userid;
                            logger.databaseError().info("Error deleting user with id " + userid + ' - Error: ' + err);
                            res.json({
                                success: false,
                                message: 'No id in request. Please supply an id to delete user.'
                            });
                        } else {
                            res.json({
                                success: true,
                                message: 'User deleted!'
                            });
                        } 
                    });
                } else {
                    res.json({
                        success: false,
                        message: 'You think you can delete the main global admin. Think again boy!'
                    }); 
                } 
            } else {
                res.json({
                    success: false,
                    message: 'No id in request. Please supply an id to delete user.'
                });
            }
        })
        
        // Update user
        .post('/', isLoggedIn, function(req, res, next) {
            var id = req.body._id;
            if(ObjectId.isValid(id)) {
                var errors = {},
                    postParams = {},
                    hasError = false,
                    user = userModel();
                    delete user.password;
                for (var key in req.body) {
                    if (req.body.hasOwnProperty(key)) {
                        // Error handling
                        if (key.indexOf('email') > -1) {
                            if (!utils.validateEmail(req.body[key])) {
                                errors[key] = "Please enter a valid email address";
                                hasError = true;
                            } else {
                                user.email = req.body[key];
                            }
                        }
                        if (key.indexOf('password') > -1 && req.body["password"].length !== 0) {
                            if (req.body[key].length < 6) {
                                errors[key] = "Password must at least be 6 characters long";
                                hasError = true;
                            } else {
                                user[key] = utils.generateHash(req.body[key]);
                            }
                        } 
                        if(key !== '_id' && key !== 'password' && key !== 'email') {
                            if(req.body[key] !== '') {
                                user[key] = req.body[key];    
                            } else {
                                errors[key] = key + " is required";
                                hasError = true;
                            }   
                        }
                        // Post params
                        postParams[key] = req.body[key];
                    }
                }
                if (!hasError) {
                    user.username = user.username.toLowerCase();

                    // Create user in database
                    DBService.updatePartialDocument({_id: mongodb.ObjectId(id)}, user, 'users', function(err, document) {
                        if (err) {
                            logger.databaseError().info('Error updating user ' + user.username + ', Error: ' + err);
                        } else {
                            res.json({
                                success: true,
                                message: 'Thank you!. User ' + user.fullname + ' has been updated.'
                            });
                        }
                    });
                } else {
                    req.flash('postParams', postParams);
                    req.flash('errors', errors);
                    res.json({
                        success: false,
                        message: 'Error validation',
                        errors : errors
                    });
                }
            } else {
                errors['Id'] = 'User id is invalid.';
                req.flash('errors', errors);
                res.json({
                    success: false,
                    message: 'Id is not valid',
                    errors : errors
                });
            }
        });
    return router;
}


// ====================================================================================================
// ==================================== LOGIN HELPERS =================================================
// ====================================================================================================
// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    req.session.returnTo = '/users';

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated() && req.user.globaladmin) {
        return next();
    } 
    res.redirect('/login');
}



