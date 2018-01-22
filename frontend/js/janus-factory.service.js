(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector')
    .factory('janusFactory', janusFactory);

  function janusFactory($window) {
    return {
      get: get
    };

    function get() {
      return $window.Janus;
    }
  }
})(angular);
