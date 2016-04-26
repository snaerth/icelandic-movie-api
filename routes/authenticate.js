"use strict";
var express = require('express');
var logger = require('../services/logservice');
var DBService = require('../services/dbservice');
var config = require('../config/config');
var utils = require('../utils/utils');
var jwt    = require('jsonwebtoken');

// =====================================
// AUTHENTICATION ======================
// =====================================
module.exports = function() {
    var router = express.Router();
    // Route for domain/auth
    router.post('/', function(req, res) {
        if (req.body.username) {
            DBService.findOne({ username: req.body.username.toLowerCase() }, 'users', function(err, user) {
                // Check if user was found
                if (!user) {
                    res.json({
                        success: false,
                        message: 'Authentication failed. User not found.'
                    });
                } else  {
                    // Check if password matches
                    if (!utils.validPasswordHash(req.body.password, user.password)) {
                        res.json({
                            success: false,
                            message: 'Authentication failed. Wrong password.'
                        });
                    } else if(!user.active) {
                        res.json({
                            success: false,
                            message: 'Authentication failed. Your user has not yet been activated. Please contact admin user for activation.'
                        });
                    } else {
                        // Create a token and set expire time to 24 hours
                        var token = jwt.sign(user, config.secret, {
                            expiresIn: 86400 
                        });

                        // Return the information including token as JSON
                        res.json({
                            success: true,
                            message: 'Enjoy your token it expires in 24 hours',
                            token: token
                        });
                    }
                }
            });
        } else {
            res.json({ success: false, message: 'Authentication failed. Username not provided.' });
        }
    });
    return router;
}