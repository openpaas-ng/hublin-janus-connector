(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector').factory('JanusFeed', JanusFeed);

  function JanusFeed($log, JANUS_CONSTANTS) {
    return function(pluginHandle, roomId, id, display) {
      this.pluginHandle = pluginHandle;
      this.roomId = roomId;
      this.id = id;
      this.display = display;

      this.listen = function() {
        $log.info('Listening to janus feed', id, 'on room', roomId);
        pluginHandle.send({
          message: {
            request: JANUS_CONSTANTS.join,
            room: roomId,
            ptype: JANUS_CONSTANTS.listener,
            feed: id
          }
        });
      };

      this.destroy = function() {
        $log.info('Destroying janus feed', id, 'on room', roomId);
        pluginHandle.detach();
      };

      this.sendData = function() {

      };

      this.subscribe = function(jsep) {
        $log.info('Subscribe to janus feed', id, 'on room', roomId);

        pluginHandle.createAnswer({
          media: {video: true, audio: true},
          jsep: jsep,
          success: function(jsep) {
            pluginHandle.send({
              message: { request: JANUS_CONSTANTS.start, room: roomId },
              jsep: jsep
            });
          },
          error: function(err) {
            $log.error('Error while sending SDP answer to janus feed', id, err);
          }
        });

        //this.pluginHandle.handleRemoteJsep({jsep: jsep});
      };

      this.setStream = function(stream) {
        $log.info('Setting stream for janus feed', id);

        this.stream = stream;
      };
    };
  }
})(angular);
