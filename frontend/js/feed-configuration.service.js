(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector').factory('JanusFeedConfiguration', JanusFeedConfiguration);

  function JanusFeedConfiguration($q, $log, JANUS_CONSTANTS) {
    return function(pluginHandle, jsep) {
      this.pluginHandle = pluginHandle;

      this.configure = function(configuration) {
        var defer = $q.defer();

        configuration.request = JANUS_CONSTANTS.configure;

        pluginHandle.send({
          message: configuration,
          jsep: jsep,
          success: function() {
            defer.resolve();
          },
          error: defer.reject
        });

        return defer.promise;
      };
    };
  }
})(angular);
