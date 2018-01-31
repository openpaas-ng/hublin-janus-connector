(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector')
    .run(runBlock);

  function runBlock(janusRTCAdapter, webRTCAdapterRegistry, janusJoinLeaveNotificationService, JANUS_MODULE_NAME) {
    webRTCAdapterRegistry.register(JANUS_MODULE_NAME, janusRTCAdapter);
    janusJoinLeaveNotificationService.registerListeners();
  }
})(angular);
