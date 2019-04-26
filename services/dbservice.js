'use strict';
var mongodb = require('mongodb');
var DBconfig = require('../config/database');
var logger = require('./logservice');

// Database connection string
var url = DBconfig.MongoDBUrlDev;

/**
 * Creates connection to database
 * --------------------------------------
 * @param {func} callback function to run
 */
var connectToDataBase = function(callback) {
  var MongoClient = mongodb.MongoClient;
  MongoClient.connect(url, function(err, db) {
    callback(err, db);
  });
};

/**
 * Create collection if it does not exist
 * --------------------------------------
 * @param {obj} database object
 * @param {string} collection name
 * @param {func} callback function to run
 */
var createCollection = function(db, collectionName, callback) {
  db.createCollection(collectionName, { size: 2147483648 }, function(
    err,
    collectionName
  ) {
    if (err) {
      logger.databaseError().info('Error createing collection! ' + err);
      db.close();
    } else {
      callback(collectionName);
    }
  });
};

/**
 * Inserts all movies into database
 * --------------------------------------
 * @param {obj} movies to insert
 * @param {string} collection name
 * @param {func} callback function to run
 */
var insertManyDocument = function(movies, collectionName, callback) {
  connectToDataBase(function(err, db) {
    if (err) {
      logger.databaseError().info('Error connection to database ' + err);
    } else {
      createCollection(db, collectionName, function() {
        var collection = db.collection(collectionName);
        collection.insertMany(movies, function(err, result) {
          if (callback) {
            callback(err, result);
          }
          db.close();
        });
      });
    }
  });
};

/**
 * Inserts all movies into database
 * Only inserts if movie object has changed
 * --------------------------------------
 * @param {obj} movies to insert
 * @param {string} collection name
 * @param {func} callback function to run
 */
var insertDocument = function(movies, collectionName, callback) {
  connectToDataBase(function(err, db) {
    if (err) {
      logger.databaseError().info('Error connection to database ' + err);
    } else {
      createCollection(db, collectionName, function() {
        var collection = db.collection(collectionName);
        movies.forEach(function(movie) {
          var criteria = { id: movie.id, title: movie.title };
          if (collectionName === 'extraimages') {
            criteria = { imdbid: movie.imdbid };
          }
          collection.update(criteria, movie, { upsert: true }, function(
            err,
            result
          ) {
            callback(err, result);
          });
        });
      });
    }
  });
};

/**
 * Inserts any obj document into database
 * --------------------------------------
 * @param {obj} obj to insert
 * @param {string} collection name
 * @param {func} callback function to run
 */
var insertAny = function(document, collectionName, callback) {
  connectToDataBase(function(err, db) {
    if (err) {
      logger.databaseError().info('Error connection to database ' + err);
    } else {
      createCollection(db, collectionName, function() {
        var collection = db.collection(collectionName);
        collection.insert(document, function(err, result) {
          if (callback) {
            callback(err, result);
          }
          db.close();
        });
      });
    }
  });
};

/**
 * Remove documents or document from database
 * for example an empty object removes all documents
 * --------------------------------------
 * @param {obj} obj to remove from db
 * @param {string} collection name
 * @param {func} callback function to run
 */
var removeDocument = function(obj, collectionName, callback) {
  connectToDataBase(function(err, db) {
    if (err) {
      logger.databaseError().info('Error connection to database ' + err);
      callback(err);
    } else {
      var collection = db.collection(collectionName);
      collection.remove(obj, function(err, numberRemoved) {
        callback(err, numberRemoved);
        db.close();
      });
    }
  });
};

/**
 * Query database with query object
 * Only returns one document
 * for example { title : 'Movie name'} returns
 * one document with same title name
 * --------------------------------------
 * @param {obj} queryObject to query
 * @param {string} collection name
 * @param {func} callback function to run
 */
var findDocument = function(queryObj, collectionName, callback) {
  connectToDataBase(function(err, db) {
    if (err) {
      logger.databaseError().info('Error connection to database ' + err);
      callback(err);
    } else {
      var collection = db.collection(collectionName);
      if (queryObj) {
        collection
          .find(queryObj)
          .limit(1)
          .toArray(function(err, docs) {
            callback(err, docs);
            db.close();
          });
      } else {
        collection.find().toArray(function(err, docs) {
          callback(err, docs);
          db.close();
        });
      }
    }
  });
};

/**
 * Query database and returns one document
 * Only returns one document
 * for example { _id : id} returns
 * one document with same id name if exsist
 * --------------------------------------
 * @param {obj} queryObject to query
 * @param {string} collection name
 * @param {func} callback function to run
 */
var findOne = function(queryObj, collectionName, callback) {
  connectToDataBase(function(err, db) {
    if (err) {
      logger.databaseError().info('Error connection to database ' + err);
      callback(err);
    } else {
      var collection = db.collection(collectionName);
      if (queryObj) {
        collection.findOne(queryObj, function(err, docs) {
          callback(err, docs);
          db.close();
        });
      } else {
        callback('No query object supplyed', null);
        db.close();
      }
    }
  });
};

/**
 * Query database with query object
 * Can return multiple documents
 * for example { title : 'Movie name'} returns
 * all documents with same title name
 * --------------------------------------
 * @param {obj} queryObject to query
 * @param {string} collection name
 * @param {func} callback function to run
 */
var findDocuments = function(queryObj, collectionName, callback) {
  connectToDataBase(function(err, db) {
    if (err) {
      logger.databaseError().info('Error connection to database ' + err);
      callback(err);
    } else {
      var collection = db.collection(collectionName);
      if (queryObj) {
        collection.find(queryObj).toArray(function(err, docs) {
          callback(err, docs);
          db.close();
        });
      } else {
        collection.find().toArray(function(err, docs) {
          callback(err, docs);
          db.close();
        });
      }
    }
  });
};

/**
 * Update specific document or documents if multiObj is defined

 * --------------------------------------
 * @param {obj} queryObject: to query
 * @param {obj} updateObj : object to update
 * @param {boolean} multiObj: If set to true, updates multiple documents that meet the query criteria. 
 * @param {string} collection name
 * @param {func} callback function to run 
 */
var updateDocument = function(
  queryObj,
  updateObj,
  multiObj,
  collectionName,
  callback
) {
  connectToDataBase(function(err, db) {
    if (err) {
      logger.databaseError().info('Error connection to database ' + err);
    } else {
      var collection = db.collection(collectionName);
      collection.update(queryObj, updateObj, multiObj, function(err, docs) {
        callback(err, docs);
        db.close();
      });
    }
  });
};

/**
 * Update specific part of a document

 * --------------------------------------
 * @param {obj} queryObject: to query
 * @param {obj} updateObj : object to update
 * @param {string} collection name
 * @param {func} callback function to run 
 */
var updatePartialDocument = function(
  queryObj,
  updateObj,
  collectionName,
  callback
) {
  connectToDataBase(function(err, db) {
    if (err) {
      logger.databaseError().info('Error connection to database ' + err);
    } else {
      var collection = db.collection(collectionName);
      collection.update(queryObj, { $set: updateObj }, function(err, docs) {
        callback(err, docs);
        db.close();
      });
    }
  });
};

/**
 * Wrapper object for main database query methods
 * */
var DBService = {
  insertManyDocument: function(movies, collectionName, callback) {
    insertManyDocument(movies, collectionName, callback);
  },
  insertDocument: function(movies, collectionName, callback) {
    insertDocument(movies, collectionName, callback);
  },
  insertAny: function(obj, collectionName, callback) {
    insertAny(obj, collectionName, callback);
  },
  findDocument: function(queryObj, collectionName, callback) {
    findDocument(queryObj, collectionName, callback);
  },
  findDocuments: function(queryObj, collectionName, callback) {
    findDocuments(queryObj, collectionName, callback);
  },
  findOne: function(queryObj, collectionName, callback) {
    findOne(queryObj, collectionName, callback);
  },
  removeDocument: function(obj, collectionName, callback) {
    removeDocument(obj, collectionName, callback);
  },
  updateDocument: function(
    queryObj,
    updateObj,
    multiObj,
    collectionName,
    callback
  ) {
    updateDocument(queryObj, updateObj, multiObj, collectionName, callback);
  },
  updatePartialDocument: function(
    queryObj,
    updateObj,
    collectionName,
    callback
  ) {
    updatePartialDocument(queryObj, updateObj, collectionName, callback);
  }
};

module.exports = DBService;
