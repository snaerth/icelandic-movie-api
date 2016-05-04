/* 
==========================================================================
Init and configs
========================================================================== 
*/
var app = angular.module('app', ['angularUtils.directives.dirPagination']);

/* 
==========================================================================
Main controller
========================================================================== 
*/
var MainController = function ($scope, httpservice) {
    $scope.userslist = [];
    $scope.isLoading = true;
    
    $scope.errorMessageUpdate = "";
    $scope.errorMessage = "";
    $scope.successMessage = "";
    
    $scope.currentPage = 1;
    $scope.pageSize = 10;
    
    // initalize
    $scope.init = function () {
        // Get all theaters
        httpservice.Get('/users/users').then(function (data) {
            if(data.message) {
                $scope.errorMessage = data.message;
            } else {
                $scope.userslist = data;
            }
            $scope.isLoading = false;
        }).catch(function (message) {
            $scope.errorMessage = "Couldn't get users from database.";
        });
    };
    
    // Updates user
    $scope.UpdateUser = function(form) {
        $scope.resetMessages();
        httpservice.Post('/users/', $scope.user).then(function (data) {
            if(!data.success) { // err
                $scope.errorMessageUpdate = data.errors;
            } else {
                $scope.successMessage = data.message;
                // Reload users list
                $scope.init();
            }
        }).catch(function (message) {
            $scope.errorMessage = "Couldn't update user in database.";
        });
    };
    
    // Opens delete user modal
    $scope.OpenDeleteUserModal = function(user) {
        $scope.resetMessages();
        // Reset delete user object
        $scope.UserToDelete = {};
        // Set delete user object
        $scope.UserToDelete = {
            id : user._id,
            fullname : user.fullname
        };
        // Open delete user modal
        OpenModal('[data-id="deleteusermodal"]');
    };
    
    // Delete user
    $scope.DeleteUser = function(id) {
        $scope.resetMessages();
        $scope.isLoading = true;
        CloseModal('[data-id="deleteusermodal"]');
        httpservice.Delete('/users', { id : id} ).then(function (data) {
            if(!data.success) { // err
                $scope.errorMessage = data.message;
            } else {
                $scope.successMessage = data.message;
                // Reload users list
                $scope.init();
            }
            $scope.isLoading = false;
        }).catch(function (message) {
            $scope.errorMessage = "Couldn't delete user in database.";
        });
    };  
    
    // Gets user from id
    $scope.GetUser = function (id) {
        $scope.resetMessages();
        $scope.UnCheckCheckboxes();
        $scope.isLoading = true;
        
        // Get all theaters
        httpservice.Get('/users/' + id).then(function (data) {
            $scope.user = data;
            $scope.user.password = "";
            $scope.CheckCheckboxes($scope.user);
            $scope.isLoading = false;
            OpenModal('[data-id="updateuserform"]');
        }).catch(function (message) {
            $scope.errorMessage = "Couldn't get user from database.";
        });
    };
    
    // Find checkboxes states with user and set checkstate   
    $scope.CheckCheckboxes = function(user) {
        for (var key in user) {
            angular.forEach(document.querySelectorAll('.mdl-js-checkbox'), function(el) {
                if(el.children[0].id == key && user[key] === true) {
                    el.MaterialCheckbox.check();
                }
            });  
        }
    };
    
   // Uncheck all checkboxes   
    $scope.UnCheckCheckboxes = function() {
        angular.forEach(document.querySelectorAll('.mdl-js-checkbox'), function(el) {
            el.MaterialCheckbox.uncheck();
        });  
    };
    
    // Opens modal
    function OpenModal(selector) {
        var modal = document.querySelector(selector);
        var pageTop = window.pageYOffset;
        modal.style.top = pageTop + 'px';
        classie.add(document.querySelector('body'), 'overflow');
        classie.add(modal, 'show');
    }
    
    // Closes modal
    function CloseModal(selector) {
        var modal = document.querySelector(selector);
        modal.style.top = 0;
        classie.remove(document.querySelector('body'), 'overflow');
        classie.remove(modal, 'show');
    }
    
    // Resets message after 5 seconds
    $scope.resetMessages = function(message) {
        $scope.errorMessageUpdate = "";
        $scope.errorMessage = "";
        $scope.successMessage = "";
        $scope.searchQuery = "";
    };

    // Run init
    $scope.init();
};

app.$inject = ['$scope', 'httpservice'];
app.controller('MainController', MainController);


/* 
==========================================================================
Factorys and Services
========================================================================== 
*/
var httpservice = function($http, $q) {    
	var Service = function(){
		var self = this;

		self.Get = function(url)
		{
			var deferred = $q.defer();
			$http({
				method: 'GET', 
				url: url,
				headers: { 'Content-Type': 'application/json'}
			}).
			success(function(data, status, headers, config) {
				deferred.resolve(data);
			}).
			error(function(data, status, headers, config) {
				deferred.reject(data);
			});
			return deferred.promise;
		};
        
        self.Post = function(url, data)
		{
			var deferred = $q.defer();
			$http({
				method: 'POST', 
				url: url,
                data : data,
				headers: { 'Content-Type': 'application/json'}
			}).
			success(function(data, status, headers, config) {
				deferred.resolve(data);
			}).
			error(function(data, status, headers, config) {
				deferred.reject(data);
			});
			return deferred.promise;
		};
        
        self.Delete = function(url, data)
		{
			var deferred = $q.defer();
			$http({
				method: 'DELETE', 
				url: url,
                data : data,
				headers: { 'Content-Type': 'application/json'}
			}).
			success(function(data, status, headers, config) {
				deferred.resolve(data);
			}).
			error(function(data, status, headers, config) {
				deferred.reject(data);
			});
			return deferred.promise;
		};
	};
	return new Service();
};


app.$inject = ['$http', '$q'];
app.factory('httpservice',httpservice);
