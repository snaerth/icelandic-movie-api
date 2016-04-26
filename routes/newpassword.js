"use strict";
var express = require('express');
var DBService = require('../services/dbservice');
var mailService = require('../services/mailservice');
var mongodb = require('mongodb');
var flash = require('connect-flash');
var userModel = require('../models/user');
var utils = require('../utils/utils');

// =====================================
// LOGIN ===============================
// =====================================
module.exports = function() {
    var router = express.Router();
    // Route for domain/newpassword
    router
        // show the newpassword form
        .get('/', function(req, res) {
            var err = req.flash('errors'),
                postParams = req.flash('postParams'),
                msg = req.flash('msg');
            // render the page and pass in any flash data if it exists
            res.render('newpassword', { 
                errors: err.length > 0 ? err : false, 
                msg: msg.length > 0 ? msg : false, 
                postParams :  postParams.length > 0 ? postParams : false,}); 
        })
        
        // Handle post request for newpassword
        .post('/', function(req, res, next) {
            var postParams = {
                username : req.body.username ? req.body.username : '',
                password : req.body.password ? req.body.password : ''
            };
            if(!req.body.username && !req.body.password) {
                renderErrorResponse(req, res,'Username and password is required', postParams);
            }
            else if(!req.body.username) {
                renderErrorResponse(req, res, 'Username is required', postParams);
            }
            else if(!req.body.password) {
                renderErrorResponse(req, res, 'Password is required', postParams);
            }
            else if(!req.body.password) {
                renderErrorResponse(req, res, 'New Password is required', postParams);
            }
            else if(req.body.password.length < 6) {
                renderErrorResponse(req, res, 'Password minimum length is 6 characters', postParams);
            }
            else if(req.body.newpassword.length < 6) {
                renderErrorResponse(req, res, 'New Password minimum length is 6 characters', postParams);
            } 
            else {
                DBService.findOne({username : req.body.username.toLowerCase()}, 'users',function(err, user) {
                     if(!user) {
                         renderErrorResponse(req, res, 'User ' + req.body.username + ' not found!', postParams);
                     } else {
                        if (!utils.validPasswordHash(req.body.password, user.password)) {
                            renderErrorResponse(req, res, 'Password does not match user password.', postParams);
                        } else {
                            user.password = utils.generateHash(req.body.newpassword);
                            DBService.updateDocument({username : user.username}, user, false, 'users',function(err, user) {
                                if(err) {
                                    renderErrorResponse(req, res,'Error createing new password. Please contact admin!', postParams);
                                } else {
                                    req.flash('msg', 'Password changed!');
                                    req.flash('postParams', postParams);
                                    res.redirect('/newpassword');  
                                }
                            });
                        }
                     }
                });
            }
        })
    return router;
}

// Renders error response
function renderErrorResponse(req, res, message, postParams){
    req.flash('errors', message);
    req.flash('postParams', postParams);
    res.redirect('/newpassword');     
}
