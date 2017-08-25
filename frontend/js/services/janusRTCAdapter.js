'use strict';

angular.module('hublin.janus.connector')
  .constant('JANUS_CONSTANTS', {
    join: 'join',
    defaultRoom: 1234,
    publisher: 'publisher'
  })

  .factory('janusRTCAdapter', function(session, JANUS_CONSTANTS) {

    return {
      handleSuccessAttach: handleSuccessAttach
    };

    function handleSuccessAttach(pluginHandle) {
      var username = session.getUsername();
      //The number of the room is the default room used by Janus.
      //It is only used temporarily, until we implement dynamic room creation.
      var register = { request: JANUS_CONSTANTS.join, room: JANUS_CONSTANTS.defaultRoom, ptype: JANUS_CONSTANTS.publisher, display: username };

      pluginHandle.send({ message: register });
    }
  });
