"use strict";
var nodemailer = require('nodemailer');
var emailConfig = require('../config/email.js');
var generator = require('xoauth2').createXOAuth2Generator({
    user: emailConfig.username,
    clientId: emailConfig.clientid,
    clientSecret: emailConfig.clientsecret,
    refreshToken: emailConfig.refreshtoken
});

// Listen for token updates
// you probably want to store these to a db
generator.on('token', function(token) {
    console.log('New token for %s: %s', token.user, token.accessToken);
});

var MailService = {
    sendMail: function(emailFrom, to, subject, text, html) {
        // login
        var transporter = nodemailer.createTransport(({
            service: 'gmail',
            auth: {
                xoauth2: generator
            }
        }));

        // setup e-mail data with unicode symbols
        var mailOptions = {
            from: emailFrom, // sender address
            to: to,
            subject: subject,
            text: text,
            html: html
        };
        
        // Send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                return console.log(error);
            }
        });
    }
};

module.exports = MailService;