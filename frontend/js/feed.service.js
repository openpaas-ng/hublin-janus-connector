(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector').factory('JanusFeed', JanusFeed);

  function JanusFeed($q, $log, JANUS_CONSTANTS) {
    return function(pluginHandle, roomId, id, displayName, type) {
      this.pluginHandle = pluginHandle;
      this.roomId = roomId;
      this.id = id;
      this.displayName = displayName;
      this.type = type;

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

      this.toggleMicrophone = function(enabled) {
        enabled ? pluginHandle.unmuteAudio() : pluginHandle.muteAudio();
      };

      this.publish = function() {
        var defer = $q.defer();

        pluginHandle.createOffer({
          //these boolean variables are default settings, until we implement a dynamic configuration
          //the user receive and send both audio and video
          media: { audioRecv: true, videoRecv: true, audioSend: true, videoSend: true },
          success: function(jsSessionEstablishmentProtocol) {
            pluginHandle.send({
              message: {
                request: JANUS_CONSTANTS.configure,
                audio: true,
                video: true
              },
              jsep: jsSessionEstablishmentProtocol
            });
            defer.resolve();
          },
          error: function(error) {
            $log.error('WebRTC error:', error);
            defer.reject(error);
          }
        });

        return defer.promise;
      };

      this.join = function() {
        pluginHandle.send({
          message: {
            request: JANUS_CONSTANTS.join,
            room: roomId,
            ptype: JANUS_CONSTANTS.publisher,
            display: displayName
          }
        });
      };

      this.leave = function() {
        pluginHandle.send({
          message: {
            request: JANUS_CONSTANTS.unpublish
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
        var defer = $q.defer();

        pluginHandle.createAnswer({
          media: {video: true, audio: true},
          jsep: jsep,
          success: function(jsep) {
            pluginHandle.send({
              message: { request: JANUS_CONSTANTS.start, room: roomId },
              jsep: jsep
            });
            defer.resolve();
          },
          error: function(err) {
            $log.error('Error while sending SDP answer to janus feed', id, err);
            defer.reject(err);
          }
        });

        return defer.promise;
      };

      this.handleRemoteJsep = function(jsep) {
        pluginHandle.handleRemoteJsep({ jsep: jsep });
      };

      this.setStream = function(stream) {
        $log.info('Setting stream for janus feed', id);

        this.stream = stream;
      };
    };
  }
})(angular);
