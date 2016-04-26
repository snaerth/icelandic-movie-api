// Create empty user object
var user = function () {
    return {
        globaladmin : false,
        admin : false,
        active : false,
        fullname : null,
        email : null,
        username : null,
        password : null,
        domain : null,
        message : null
    };
};

module.exports = user;