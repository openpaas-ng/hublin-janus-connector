'use strict';

angular.module('hublin.janus.connector')
  .constant('JANUS_CONSTANTS', {
    join: 'join',
    defaultRoom: 1234,
    publisher: 'publisher',
    listener: 'listener',
    serverAddress: 'http://localhost:8088/janus',
    videoroom: 'janus.plugin.videoroom',
    configure: 'configure',
    joined: 'joined',
    attached: 'attached',
    event: 'event',
    unpublish: 'unpublish',
    start: 'start'
  })

  .factory('janusFactory', function() {
    function get($window) {
      return window.Janus;
    }

    return {
      get: get
    };
  })

  .factory('janusRTCAdapter', function($rootScope, currentConferenceState, janusFactory, session, LOCAL_VIDEO_ID, REMOTE_VIDEO_IDS, JANUS_CONSTANTS) {
    var selectiveForwardingUnit, Janus, plugin, feeds = [];

    return {
      connect: connect,
      getPlugin: getPlugin,
      handleSuccessAttach: handleSuccessAttach,
      lazyJanusInstance: lazyJanusInstance,
      handleError: handleError,
      handleEventMessage: handleEventMessage,
      handleJoinedMessage: handleJoinedMessage,
      handleLocalStream: handleLocalStream,
      handleOnMessage: handleOnMessage,
      leaveRoom: leaveRoom,
      newRemoteFeed: newRemoteFeed,
      publishOwnFeed: publishOwnFeed,
      setPlugin: setPlugin,
      setSfu: setSfu,
      setFeeds: setFeeds
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

    //used for tests
    function setSfu(_selectiveForwardingUnit) {
      selectiveForwardingUnit = _selectiveForwardingUnit;
    }
    function setFeeds(_feeds) {
      feeds = _feeds;
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

    function leaveRoom() {
      Janus.debug('we are leaving a room');
      plugin.send({
        message:{
          request: JANUS_CONSTANTS.unpublish
        }
      });
      Janus.debug('unpublish request is sent');
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

    function attachFeeds(msg) {
      if (msg.publishers) {
        var publishers = msg.publishers;
        Janus.debug('Got a list of available publishers/feeds:');
        Janus.debug(publishers);
        publishers.forEach(function(publisher) {
          newRemoteFeed(publisher.id, publisher.display);
        });
      }
    }

    function unpublishFeed(msg) {
      var unpublishedFeed = null;
      for (var i = 0; i < REMOTE_VIDEO_IDS.length; i++) {
        if (feeds[i] && feeds[i].rfid === msg.unpublished) {
          unpublishedFeed = feeds[i];
          break;
        }
      }
      if (unpublishedFeed) {
        Janus.debug('Feed ' + unpublishedFeed.rfid + ' (' + unpublishedFeed.rfdisplay + ') has left the room, detaching');
        currentConferenceState.removeAttendee(unpublishedFeed.rfindex);
        feeds[unpublishedFeed.rfindex] = null;
        unpublishedFeed.detach();
      }
    }

    function handleEventMessage(msg) {
      if (msg.publishers) {
        attachFeeds(msg);
      }else if (msg.unpublished) {
        unpublishFeed(msg);
      }
    }

    function handleJoinedMessage(msg) {
      var myid = msg.id;
      var index = 0;

      currentConferenceState.pushAttendee(index, myid, session.getUserId(), session.getUsername());
      publishOwnFeed();
      attachFeeds(msg);
    }

    function handleError(error) {
      Janus.debug('Error: ' + error);
    }

    function handleOnMessage(msg, jsSessionEstablishmentProtocol) {
      Janus.debug(' ::: Got a message (publisher) :::');
      if (msg) {
        switch (msg.videoroom) {
          case JANUS_CONSTANTS.joined:
            handleJoinedMessage(msg);
            break;
          case JANUS_CONSTANTS.event:
            handleEventMessage(msg);
            break;
          default:
            Janus.debug('Not valid Event');
            break;
        }
      }
      if (jsSessionEstablishmentProtocol) {
        getPlugin().handleRemoteJsep({ jsep: jsSessionEstablishmentProtocol});
      }
    }

    function newRemoteFeed(id, display) {
      var remotePlugin = {};

      function handleRemoteSuccessAttach(pluginHandle) {
        Janus.debug('we are attaching a new feed');
        remotePlugin = pluginHandle;
        pluginHandle.send({
          message: {
            request: JANUS_CONSTANTS.join,
            room: JANUS_CONSTANTS.defaultRoom,
            ptype: JANUS_CONSTANTS.listener,
            feed: id
          }
        });
      }

      function handleOnRemoteStream(stream) {
        var element = currentConferenceState.getVideoElementById(REMOTE_VIDEO_IDS[remotePlugin.rfindex - 1]);
        Janus.attachMediaStream(element.get(0), stream);
      }

      function handleJsep(jsSessionEstablishmentProtocol) {
        Janus.debug('Handling SDP as well...');
        // Answer and attach
        remotePlugin.createAnswer({
          media: {video:true, audio:true},
          jsep: jsSessionEstablishmentProtocol,
          success: function(jsSessionEstablishmentProtocol) {
            Janus.debug('Got SDP! JSEP');
            remotePlugin.send({
              message: { request: JANUS_CONSTANTS.start, room: JANUS_CONSTANTS.defaultRoom },
              jsep: jsSessionEstablishmentProtocol
            });
          },
          error: handleError
        });
      }

      function handleAttachedMessage(msg) {
        remotePlugin.rfid = msg.id;
        remotePlugin.rfdisplay = msg.display;
        for (var i = 1; i <= REMOTE_VIDEO_IDS.length; i++) {
          if (!feeds[i]) {
            feeds[i] = remotePlugin;
            remotePlugin.rfindex = i;
            currentConferenceState.pushAttendee(remotePlugin.rfindex, remotePlugin.rfid, null, display);
            break;
          }
        }
      }

      function handleRemoteOnMessage(msg, jsSessionEstablishmentProtocol) {
        Janus.debug('we are dealing with on message subsciber');
        if (jsSessionEstablishmentProtocol) {
          handleJsep(jsSessionEstablishmentProtocol);
        }
        if (msg && msg.videoroom === JANUS_CONSTANTS.attached) {
          handleAttachedMessage(msg);
        }
      }

      selectiveForwardingUnit.attach({
        plugin: JANUS_CONSTANTS.videoroom,
        success: handleRemoteSuccessAttach,
        error: handleError,
        onremotestream: handleOnRemoteStream,
        onmessage: handleRemoteOnMessage
      });
    }

    function connect() {
      var Janus = lazyJanusInstance();

      Janus.init({
        debug: true,
        callback: function() {
          selectiveForwardingUnit = new Janus({
            server: JANUS_CONSTANTS.serverAddress,
            success: function() {
              Janus.debug('Session created!');
              selectiveForwardingUnit.attach({
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

