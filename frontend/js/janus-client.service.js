(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector').factory('janusClient', janusClient);

  function janusClient($log, $q, JANUS_CONSTANTS) {
    return function(pluginHandle) {
      return {
        assertRoomExists: assertRoomExists,
        createRoom: createRoom,
        isRoomExists: isRoomExists
      };

      function assertRoomExists(roomId) {
        return isRoomExists(roomId)
          .then(function(exists) {
            return exists ? $q.when() : createRoom(roomId);
          });
      }

      function createRoom(roomId) {
        var defer = $q.defer();

        pluginHandle.send({
          message: {
            request: JANUS_CONSTANTS.create,
            room: roomId
          },
          success: function() {
            defer.resolve();
          },
          error: defer.reject
        });

        return defer.promise;
      }

      function isRoomExists(roomId) {
        var defer = $q.defer();

        pluginHandle.send({
          message: {
            request: JANUS_CONSTANTS.exists,
            room: roomId
          },
          success: function(janusResponse) {
            defer.resolve(janusResponse && janusResponse.exists);
          },
          error: defer.reject
        });

        return defer.promise;
      }
    };
  }
})(angular);
