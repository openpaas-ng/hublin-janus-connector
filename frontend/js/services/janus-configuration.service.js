(function() {
  'use strict';

  angular.module('hublin.janus.connector')
    .service('janusConfigurationService', janusConfigurationService);

  function janusConfigurationService($window) {

    return {
      getConferenceConfiguration: getConferenceConfiguration
    };

    function getConferenceConfiguration(conference) {
      var configuration = conference.configuration.hosts.find(function(config) {
        return config.type === 'janus';
      });

      if (!configuration) {
        return {
          type: 'janus',
          url: $window.location.protocol + '//' + $window.location.hostname + ':8088/janus'
        };
      }

      return configuration;
    }
  }
})();
