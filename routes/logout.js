"use strict";
var express = require('express');
var DBService = require('../services/dbservice');
var mailService = require('../services/mailservice');
var mongodb = require('mongodb');
var flash = require('connect-flash');
var userModel = require('../models/user');

// =====================================
// LOGOUT ==============================
// =====================================
module.exports = function(passport) {
    var router = express.Router();
    // Route for domain/logout
    router.get('/', function(req, res) {
        req.session.destroy(function(err) {
            req.logOut();
            res.redirect('/');
        });
    });
    return router;
}

