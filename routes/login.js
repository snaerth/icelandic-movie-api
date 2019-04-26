'use strict';
var express = require('express');
var DBService = require('../services/dbservice');
var mailService = require('../services/mailservice');
var mongodb = require('mongodb');
var flash = require('connect-flash');
var userModel = require('../models/user');

// =====================================
// LOGIN ===============================
// =====================================
module.exports = function(passport) {
  var router = express.Router();
  // Route for domain/login
  router
    // show the login form
    .get('/', function(req, res) {
      var err = req.flash('errors'),
        postParams = req.flash('postParams');
      // render the page and pass in any flash data if it exists
      res.render('login', {
        errors: err.length > 0 ? err : false,
        msg: false,
        postParams: postParams.length > 0 ? postParams : false
      });
    })

    // Handle post request from login
    .post('/', function(req, res, next) {
      var postParams = {
        username: req.body.username ? req.body.username : '',
        password: req.body.password ? req.body.password : ''
      };
      if (!req.body.username && !req.body.password) {
        req.flash('errors', 'Username and password is required');
        res.redirect('/login');
      } else if (!req.body.username) {
        req.flash('errors', 'Username is required');
        req.flash('postParams', postParams);
        res.redirect('/login');
      } else if (!req.body.password) {
        req.flash('errors', 'Password is required');
        req.flash('postParams', postParams);
        res.redirect('/login');
      } else {
        passport.authenticate('local-login', {
          successRedirect: '/', // redirect to the secure profile section
          successReturnToOrRedirect: '/',
          failureRedirect: '/login', // redirect back to the signup page if there is an error
          failureFlash: true // allow flash messages
        })(req, res, next);
      }
    });
  return router;
};
