"use strict";
var uuid = require('node-uuid');
var bcrypt = require('bcryptjs');



/**
 * Generating a hash
 * ---------------------------------------
 * @Returns {string} with hash
 */
function generateHash(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}


/**
 * Checking if password is valid agains hashed password
 * ---------------------------------------
 * @Returns {string} true if valid
 */
function validPasswordHash(password, hashedPassword) {
    return bcrypt.compareSync(password, hashedPassword);
}

/**
 * Generates uuid id
 * ---------------------------------------
 * @Returns {string} new uuid id
 */
function createGuid() {
    return uuid.v1();
}

/**
 * Creates certificate for Icelandic theaters
 * ---------------------------------------
 * @Param {obj} certificate object to work with
 * @Returns {obj} with Icelandic certificates + colors
 */
function certificateExtra(certificate) {
    var extra = { color: null, number: null };
    if (certificate) {
        if (certificate.indexOf('NC-17') > -1) {
            extra.color = "red";
            extra.number = "18";
        }
        else if (certificate.indexOf('16') > -1 || (certificate.indexOf('R') > -1 && certificate.length === 1)) {
            extra.color = "red";
            extra.number = "16";
        } else if (certificate.indexOf('12') > -1 || certificate.indexOf('PG-13') > -1) {
            extra.color = "yellow";
            extra.number = "12";
        } else if (certificate.indexOf('9') > -1) {
            extra.color = "orange";
            extra.number = "9";
        } else if (certificate.indexOf('6') > -1) {
            extra.color = "green";
            extra.number = "6";
        } else {
            extra.color = "green";
            extra.number = "L";
        }
    }
    return extra;
}


/**
 * Deep trims every property in object
 * ---------------------------------------
 * @Param {obj} to trim
 */
function DeepTrim(obj) {
    for (var prop in obj) {
        var value = obj[prop], type = typeof value;
        if (value != null && (type == "string" || type == "object") && obj.hasOwnProperty(prop)) {
            if (type == "object") {
                DeepTrim(obj[prop]);
            } else {
                obj[prop] = obj[prop].trim();
            }
        }
    }
}

/**
 * Splits array into chunks
 * For example splitToChunks([1,2,3,4,5,6,7,8,9], 3)
 * -------------------------------------------------
 * @param {array} array of anything 
 * @param {int} chunk size
 * @Returns a new array divided into chunks size[[1,2.3],[4,5,6],[7,8,9]] 
 */
function splitToChunks(arr, chunk) {
    var chunk = chunk;
    var newarr = new Array();
    for (var i = 0; i < arr.length; i = i + chunk) {
        newarr.push(arr.slice(i, i + chunk));
    }
    return newarr;
}

/**
 * Validates email string
 * ---------------------------------------
 * @param {string} email
 * @Returns true if valid, false otherwise 
 */
function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

/**
 * Generates human readable datetime now
 * ---------------------------------------
 * @Returns readable date format ( "YYYY-MMMM-DD - HH:MM:SS"  )
 */
function getFormattedDate(noClock) {
    var date = new Date(),
        month = date.getMonth() + 1,
        day = date.getDate(),
        hour = date.getHours(),
        min = date.getMinutes(),
        sec = date.getSeconds();

    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;
    if(!noClock) {
        var str = date.getFullYear() + "-" + month + "-" + day;
    } else {
        var str = date.getFullYear() + "-" + month + "-" + day + " - " + hour + ":" + min + ":" + sec;    
    }
    
    return str;
}

/**
 * Creates html table from object propertys
 * ---------------------------------------
 * @Param {obj} obj to convert to html table
 * @Returns {string} Html table from param object
 */
function createHtmlTableFromObjectProperty(obj) {
    var table = '<table border="1">';
    for (var key in obj) {
        table += '<tr><td>' + key + '</td>' + '<td>' + obj[key] + '</td></tr>';
    }
    table += '</table>';
    return table;
}

module.exports = {
    createGuid: createGuid,
    certificateExtra: certificateExtra,
    DeepTrim: DeepTrim,
    splitToChunks: splitToChunks,
    validateEmail: validateEmail,
    getFormattedDate: getFormattedDate,
    createHtmlTableFromObjectProperty : createHtmlTableFromObjectProperty,
    validPasswordHash : validPasswordHash,
    generateHash: generateHash
} 