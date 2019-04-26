'use strict';
var config = require('../config/api');
var HttpService = require('./httpservice');
var FileService = require('./fileservice');
var logger = require('./logservice');
var fs = require('fs-extra');
var DBService = require('./dbservice');
var _underscore = require('underscore');

/**
 * Gets extra images from moviedatabase
 * @param {filepath} path to get from movies
 * @param {FilePath} path to write to json file
 * @author : Snær Seljan Þóroddsson
 * */
var extraImageService = function(films, FilePath, collectionName, callback) {
  if (films) {
    var extraImagesArr = [];
    var promises = [];

    films.forEach(function(film) {
      var imdbid = null;

      if (film.omdb && film.omdb[0] && film.omdb[0].imdbID) {
        imdbid = film.omdb[0].imdbID;
      } else if (film.ids && film.ids.imdb) {
        imdbid = 'tt' + film.ids.imdb;
      }

      if (imdbid !== null) {
        //-------------------------------------
        // Get extra images from movie database
        //-------------------------------------
        promises.push(
          new Promise(function(resolve) {
            return setTimeout(resolve, 1000);
          }).then(function() {
            return HttpService.getContent(
              config.themoviedburl +
                imdbid +
                '/images?api_key=' +
                config.themoviedbkey
            )
              .then(function(data) {
                var obj = {};
                obj.imdbid = imdbid;
                obj.results = JSON.parse(data);
                extraImagesArr.push(obj);
              })
              .catch(function(err) {});
          })
        );
      }
    });
    //--------------------------------
    // When all promises have finished
    //--------------------------------
    Promise.all(promises)
      .then(function(data) {
        // Check if file has been created
        fs.exists(FilePath, function(exists) {
          if (exists) {
            FileService.readFromJson(FilePath, function(data) {
              // Merges array of objects
              var mergedData = _underscore._.union(data, extraImagesArr);
              FileService.writeToJson(mergedData, FilePath, function() {
                // Run callback func from initServices
                if (callback) callback();
              });
            });
          } else {
            FileService.writeToJson(extraImagesArr, FilePath, function() {
              // Run callback func from initServices
              if (callback) callback();
            });
          }
        });

        // Insert extra images into database
        DBService.insertDocument(extraImagesArr, collectionName, function(
          err,
          result
        ) {
          if (err)
            logger
              .databaseError()
              .info(
                'Error inserting document extra images to database, Error: ' +
                  err
              );
        });
      })
      .catch(function(err) {
        logger.error().info('ErrorMessage here: ' + err);
      });
  }
};

module.exports = extraImageService;
