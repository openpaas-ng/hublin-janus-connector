'use strict';

angular.module('hublin.janus.connector')
  .constant('JANUS_CONSTANTS', {
    join: 'join',
    defaultRoom: 1234,
    publisher: 'publisher',
    serverAddress: 'http://localhost:8088/janus',
    videoroom: 'janus.plugin.videoroom',
    configure: 'configure'
  })

  .factory('janusFactory', function() {
    function get($window) {
      return window.Janus;
    }

    return {
      get: get
    };
  })

  .factory('janusRTCAdapter', function(currentConferenceState, janusFactory, session, LOCAL_VIDEO_ID, JANUS_CONSTANTS) {
    var Janus, plugin;

    return {
      connect: connect,
      getPlugin: getPlugin,
      handleSuccessAttach: handleSuccessAttach,
      lazyJanusInstance: lazyJanusInstance,
      onLocalStream: onLocalStream,
      publishOwnFeed: publishOwnFeed,
      setPlugin: setPlugin
    };

    function lazyJanusInstance() {
      if (!Janus) {
        Janus = janusFactory.get();
      }

      return Janus;
    }

    function getPlugin() {
      return plugin;
    }

    function setPlugin(_plugin) {
      plugin = _plugin;
    }

    function handleSuccessAttach(pluginHandle) {
      setPlugin(pluginHandle);
      var username = session.getUsername();

      //The number of the room is the default room used by Janus.
      //It is only used temporarily, until we implement dynamic room creation.
      pluginHandle.send({
        message: {
          request: JANUS_CONSTANTS.join,
          room: JANUS_CONSTANTS.defaultRoom,
          ptype: JANUS_CONSTANTS.publisher,
          display: username
        }
      });
    }

    function onLocalStream(localStream) {
      var Janus = lazyJanusInstance();
      var element = currentConferenceState.getVideoElementById(LOCAL_VIDEO_ID);

      Janus.attachMediaStream(element, localStream);
    }

    function publishOwnFeed() {
      plugin.createOffer({
        //these boolean variables are default settings, until we implement a dynamic configuration
        //the user receive and send both audio and video
        media: { audioRecv: true, videoRecv: true, audioSend: true, videoSend: true },
        success: function(jsep) {
          Janus.debug('Got publisher SDP!');
          plugin.send({
            message: {
              request: JANUS_CONSTANTS.configure,
              audio: true,
              video: true
            },
            jsep: jsep
          });
        },
        error: function(error) {
          Janus.error('WebRTC error:', error);
        }
      });
    }

    function connect() {
      var Janus = lazyJanusInstance();

      Janus.init({
        debug: true,
        callback: function() {
          var janus = new Janus({
            server: JANUS_CONSTANTS.serverAddress,
            success: function() {
              Janus.debug('Session created!');
              janus.attach({
                plugin: JANUS_CONSTANTS.videoroom,
                success: handleSuccessAttach,
                error: function(error) {
                  Janus.debug('Error: ' + error);
                }
              });
            },
            error: function(error) {
              Janus.debug('Error while creating the session: ' + error);
            }
          });
        }
      });
    }
  });

