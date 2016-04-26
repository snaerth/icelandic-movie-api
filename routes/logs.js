"use strict";
var express = require('express');
var fs = require('fs-extra');
var logger = require('../services/logservice');

// ====================================
// LOGS ===============================
// ====================================
module.exports = function(passport) {
    var router = express.Router();
    // Route for domain/logs
    router
        // Map of routes for logs
        .get('/logs', isLoggedIn, function(req, res) {
            res.send({
                logPaths : ['/logs/database', '/logs/error']
            });
        })

        // Database errors
        .get('/database', isLoggedIn, function(req, res) {
            var errorPath = logger.getFilePaths().database;
            if (fs.existsSync(errorPath)) {
                fs.readFile(errorPath, function read(err, data) {
                    if (err) {
                        res.send('Error reading from log');
                    } else {
                        res.send(data);
                    }
                });
            }
        })

        // Service errors
        .get('/error', isLoggedIn, function(req, res) {
            var errorPath = logger.getFilePaths().error;
            if (fs.existsSync(errorPath)) {
                fs.readFile(errorPath, function read(err, data) {
                    if (err) {
                        res.send('Error reading from log');
                    } else {
                        res.send(data);
                    }
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
    req.session.returnTo = '/logs';
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated() && req.user.globaladmin) {
        return next();
    }
    res.redirect('/login');
}



