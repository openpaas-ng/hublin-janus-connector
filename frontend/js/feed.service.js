(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector').factory('JanusFeed', JanusFeed);

  function JanusFeed($q, $log, JanusFeedConfiguration, currentConferenceState, JANUS_CONSTANTS) {
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

      this.toggleRemoteAudio = function(enabled) {
        if (this.stream && this.stream.getAudioTracks) {
          var tracks = this.stream.getAudioTracks();

          if (tracks) {
            tracks.forEach(function(track) {
              track.enabled = enabled;
            });
          }
        }
      };

      this.toggleVideo = function(enabled) {
        enabled ? pluginHandle.unmuteVideo() : pluginHandle.muteVideo();
      };

      this.publish = function(options) {
        var defer = $q.defer();

        //these boolean variables are default settings, until we implement a dynamic configuration
        //the user receive and send both audio and video
        var configuration = { audio: true, video: true };
        var media = { audioRecv: true, videoRecv: true, audioSend: true, videoSend: true };

        if (options.bitrate) {
          configuration.bitrate = options.bitrate;
        }

        pluginHandle.createOffer({
          media: media,
          success: function(jsSessionEstablishmentProtocol) {
            this.config = new JanusFeedConfiguration(pluginHandle, jsSessionEstablishmentProtocol);
            this.config.configure(configuration)
              .then(function() {
                $log.debug('Configured with', configuration);
              })
              .catch(function(err) {
                $log.warn('Configuration failed', err);
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
            display: JSON.stringify({ display: displayName, id: id })
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

      this.subscribe = function(jsep) {
        $log.info('Subscribe to janus feed', id, 'on room', roomId);
        var defer = $q.defer();

        pluginHandle.createAnswer({
          media: { video: true, audio: true },
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

      this.getStatus = function() {
        var attendee = currentConferenceState.getAttendeeByRtcid(id);

        return {
          id: attendee.id,
          displayName: attendee.displayName,
          avatar: attendee.avatar,
          mute: attendee.mute || false,
          muteVideo: attendee.muteVideo || false,
          speaking: attendee.speaking || false,
          timezoneOffset: attendee.timezoneOffset || false
        };
      };
    };
  }
})(angular);
