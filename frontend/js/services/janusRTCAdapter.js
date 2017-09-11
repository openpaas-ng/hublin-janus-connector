'use strict';

angular.module('hublin.janus.connector')
  .constant('JANUS_CONSTANTS', {
    join: 'join',
    defaultRoom: 1234,
    publisher: 'publisher',
    serverAddress: 'http://localhost:8088/janus',
    videoroom: 'janus.plugin.videoroom',
    configure: 'configure',
    joined: 'joined'
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
      handleError: handleError,
      handleJoinedMessage: handleJoinedMessage,
      handleLocalStream: handleLocalStream,
      handleOnMessage: handleOnMessage,
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

    function handleLocalStream(localStream) {
      var Janus = lazyJanusInstance();
      var element = currentConferenceState.getVideoElementById(LOCAL_VIDEO_ID).get(0);

      Janus.attachMediaStream(element, localStream);
    }

    function publishOwnFeed() {
      plugin.createOffer({
        //these boolean variables are default settings, until we implement a dynamic configuration
        //the user receive and send both audio and video
        media: { audioRecv: true, videoRecv: true, audioSend: true, videoSend: true },
        success: function(jsSessionEstablishmentProtocol) {
          Janus.debug('Got publisher SDP!');
          plugin.send({
            message: {
              request: JANUS_CONSTANTS.configure,
              audio: true,
              video: true
            },
            jsep: jsSessionEstablishmentProtocol
          });
        },
        error: function(error) {
          Janus.error('WebRTC error:', error);
        }
      });
    }

    function handleJoinedMessage(msg) {
      var myid = msg.id;
      var index = 0;
      currentConferenceState.pushAttendee(index, myid, session.getUserId(), session.getUsername());

      publishOwnFeed();
    }

    function handleError(error) {
      Janus.debug('Error: ' + error);
    }

    function handleOnMessage(msg, jsSessionEstablishmentProtocol) {
      Janus.debug(' ::: Got a message (publisher) :::');
      Janus.debug(msg);
      if (msg) {
        var event = msg.videoroom;
        if (event && event === JANUS_CONSTANTS.joined) {
          handleJoinedMessage(msg);
        }
      }

      if (jsSessionEstablishmentProtocol) {
        getPlugin().handleRemoteJsep({ jsep: jsSessionEstablishmentProtocol});
      }
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
                error: handleError,
                onmessage: handleOnMessage,
                onlocalstream: handleLocalStream
              });
            },
            error: handleError
          });
        }
      });
    }
  });

