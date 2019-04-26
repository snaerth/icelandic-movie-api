'use strict';
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var flash = require('connect-flash');
var CronJob = require('cron').CronJob;
var session = require('express-session');
var MongoStore = require('connect-mongo');
var passport = require('passport');
// Reference to all run all services
var initServices = require('./services/initservices.js');
var logService = require('./services/logservice.js');
var config = require('./config/config');
var dbConfig = require('./config/database');
var cors = require('cors');

var isDevelopment = process.env.NODE_ENV === 'development';

require('./config/passport')(passport);

var app = express();

initServices(function() {
  console.log('Everything is done');
});

// Task that runs every day at 5 AM
new CronJob(
  '00 00 08 * * 0-6',
  function() {
    // Initalize Services for api
    logService.resetLogs();
    initServices(function() {});
  },
  null,
  true,
  'Atlantic/Reykjavik'
);

// configuration ===============================================================

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs'); // default view engine
app.set('TokenSecret', config.secret); // secret variable for token authentication

//uncomment after placing your favicon in /public
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', '/favicon/favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser('DarthVader'));

var MongoStoreSession = MongoStore(session);
var sessionOptions = {
  secret: 'DarthVader',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 86400 }, //24 Hours
  store: new MongoStoreSession({
    url: isDevelopment ? dbConfig.MongoDBUrlDev : dbConfig.MongoDBUrlPro
  })
};
app.use(session(sessionOptions));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(cors({ credentials: true, origin: true }));

// Routes ======================================================================

var index = require('./routes/index')(passport);
var createuser = require('./routes/createuser')(passport);
var login = require('./routes/login')(passport);
var logout = require('./routes/logout')(passport);
var users = require('./routes/users')(passport);
var logs = require('./routes/logs')(passport);
var newpassword = require('./routes/newpassword')();
var authenticate = require('./routes/authenticate')();

app.use('/', index);
app.use('/login', login);
app.use('/logout', logout);
app.use('/createuser', createuser);
app.use('/authenticate', authenticate);
app.use('/users', users);
app.use('/logs', logs);
app.use('/newpassword', newpassword);

app.use(function(req, res, next) {
  res.locals.message = req.flash();
  next();
});

// Error handlers
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('404 Page Not Found');
  err.status = 404;
  if (req.isAuthenticated() && req.user.globaladmin) {
    return next(err);
  }
  next(err);
});

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {},
    errors: false,
    postParams: false,
    msg: false,
    user: false
  });
});

// launch ======================================================================
app.listen(isDevelopment ? 3000 : 80);

module.exports = app;
