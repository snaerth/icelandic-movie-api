"use strict";
var bunyan = require('bunyan');
var fs = require('fs-extra');

var filePathList = {
    error: 'logger/error.json',
    database: 'logger/databaseError.json'
}

var Service = {
    error : function() { 
        var log = bunyan.createLogger({
            name: "error",
            streams: [{
                level: 'info',
                path: filePathList.error
            }]
        });
        return log;
    },
    databaseError : function() { 
        var log = bunyan.createLogger({
            name: "databaseError",
            streams: [{
                level: 'info',
                path: filePathList.database
            }]
        });
        return log;
    },
    resetLogs : function() {
        for(var prop in filePathList) {
            if(fs.existsSync(filePathList[prop])) {
                fs.writeFile(filePathList[prop], '');
            }
        }
    },
    getFilePaths : function() {
        return filePathList;
    }
};

module.exports = Service;