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

  .factory('janusFactory', function($window) {
    function get() {
      return $window.Janus;
    }

    return {
      get: get
    };
  })

  .factory('janusRTCAdapter', function($q, $log, currentConferenceState, janusFactory, session, LOCAL_VIDEO_ID, REMOTE_VIDEO_IDS, JANUS_CONSTANTS) {
    var selectiveForwardingUnit, Janus, plugin, feeds = [];
    var videoEnabled = true;
    // TODO for janus
    var canEnumerateDevices = true;
    var NOT_CONNECTED = 0;
    var BECOMING_CONNECTED = 1;
    var IS_CONNECTED = 2;

    Janus = lazyJanusInstance();
    Janus.init({
      debug: true,
      callback: function() {
        Janus.debug('Janus initialized');
        Janus.listDevices(function(results) {
          videoEnabled = results.some(function(devices) {
          return devices.kind === 'videoinput';
        });
        });
      }
    });

    return {
      connect: connect,
      getPlugin: getPlugin,
      getSfu: getSfu,
      handleSuccessAttach: handleSuccessAttach,
      lazyJanusInstance: lazyJanusInstance,
      handleError: handleError,
      handleEventMessage: handleEventMessage,
      handleJoinedMessage: handleJoinedMessage,
      handleLocalStream: handleLocalStream,
      handleOnMessage: handleOnMessage,
      leaveRoom: leaveRoom,
      newRemoteFeed: newRemoteFeed,
      isVideoEnabled: isVideoEnabled,
      publishOwnFeed: publishOwnFeed,
      setPlugin: setPlugin,
      setSfu: setSfu,
      setFeeds: setFeeds,
      // NOT IMPLEMENTED (BUT MUST!)
      setVideoEnabled: setVideoEnabled,
      setGotMedia: setGotMedia,
      configureBandwidth: configureBandwidth,
      enableVideo: enableVideo,
      addDisconnectCallback: addDisconnectCallback,
      removeDisconnectCallback: removeDisconnectCallback,
      sendData: sendData,
      myRtcid: myRtcid,
      performCall: performCall,
      canEnumerateDevices: canEnumerateDevices,
      enableMicrophone: enableMicrophone,
      muteRemoteMicrophone: muteRemoteMicrophone,
      enableCamera: enableCamera,
      setPeerListener: setPeerListener,
      broadcastData: broadcastData,
      broadcastMe: broadcastMe,
      sendDataP2P: sendDataP2P,
      sendDataWS: sendDataWS,
      getP2PConnectionStatus: getP2PConnectionStatus,
      doesDataChannelWork: doesDataChannelWork,
      NOT_CONNECTED: NOT_CONNECTED,
      BECOMING_CONNECTED: BECOMING_CONNECTED,
      IS_CONNECTED: IS_CONNECTED,
      addDataChannelOpenListener: addDataChannelOpenListener,
      addDataChannelCloseListener: addDataChannelCloseListener,
      removeDataChannelOpenListener: removeDataChannelOpenListener,
      removeDataChannelCloseListener: removeDataChannelCloseListener,
      addPeerListener: addPeerListener,
      removePeerListener: removePeerListener,
      connection: connection,
      getOpenedDataChannels: getOpenedDataChannels

    };

    function lazyJanusInstance() {
      return janusFactory.get();
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
    function getSfu() {
      return selectiveForwardingUnit;
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
      Janus.debug('leaving a room');
      plugin.send({
        message: {
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
      } else if (msg.unpublished) {
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

    function setVideoEnabled(enabled) {
      videoEnabled = enabled;
    }

    function isVideoEnabled() {
      return videoEnabled;
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
          media: {video: true, audio: true},
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
        Janus.debug('Handling remote message', msg);
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

    function setGotMedia(callback) {
      $log.warn('setGotMedia is not implemented in Janus connector');
      callback();
    }

    function configureBandwidth(bitRates) {
      $log.warn('configureBandwidth is not implemented in Janus connector', bitRates);
    }

    function enableVideo(videoChoice) {
      $log.warn('enableVideo is not implemented in Janus connector', videoChoice);
    }

    function addDisconnectCallback() {
      $log.warn('addDisconnectCallback is not implement in Janus connector');
    }

    function sendData(easyrtcid, msgType, data, ackhandler) {
      $log.warn('sendData is not implement in Janus connector', easyrtcid, msgType, data, ackhandler);
    }

    function myRtcid() {
      $log.warn('myRtcid is not implement in Janus connector');

      return 'idontknow';
    }

    function performCall(otherRTCid) {
      $log.warn('performCall is not implement in Janus connector', otherRTCid);
    }

    function enableMicrophone(muted) {
      $log.warn('enableMicrophone is not implement in Janus connector', muted);
    }

    function muteRemoteMicrophone(rtcId, mute) {
      $log.warn('muteRemoteMicrophone is not implement in Janus connector', rtcId, mute);
    }

    function enableCamera(videoMuted) {
      $log.warn('enableCamera is not implement in Janus connector', videoMuted);
    }

    function setPeerListener(handler, msgType) {
      $log.warn('setPeerListener is not implement in Janus connector', handler, msgType);
    }

    function broadcastData(msgType, data) {
      $log.warn('broadcastData is not implement in Janus connector', msgType, data);
    }

    function broadcastMe() {
      $log.warn('broadcastMe is not implement in Janus connector');
    }

    function removeDisconnectCallback(id) {
      $log.warn('removeDisconnectCallback is not implement in Janus connector', id);
    }

    function sendDataP2P(rtcid, msgType, data) {
      $log.warn('sendDataP2P is not implement in Janus connector', rtcid, msgType, data);
    }

    function sendDataWS(rtcid, msgType, data, ackhandler) {
      $log.warn('sendDataWS is not implement in Janus connector', rtcid, msgType, data, ackhandler);
    }

    function getP2PConnectionStatus(rtcid) {
      $log.warn('getP2PConnectionStatus is not implement in Janus connector', rtcid);
    }

    function doesDataChannelWork(rtcid) {
      $log.warn('doesDataChannelWork is not implement in Janus connector', rtcid);
    }

    function addDataChannelOpenListener() {
      $log.warn('addDataChannelOpenListener is not implement in Janus connector');
    }

    function addDataChannelCloseListener() {
      $log.warn('addDataChannelCloseListener is not implement in Janus connector');
    }

    function removeDataChannelOpenListener() {
      $log.warn('removeDataChannelOpenListener is not implement in Janus connector');
    }

    function removeDataChannelCloseListener() {
      $log.warn('removeDataChannelCloseListener is not implement in Janus connector');
    }

    function addPeerListener() {
      $log.warn('addPeerListener is not implement in Janus connector');
    }

    function removePeerListener() {
      $log.warn('removePeerListener is not implement in Janus connector');
    }

    function connection() {
      $log.warn('connection is not implement in Janus connector');

      return $q.when({});
    }

    function getOpenedDataChannels() {
      $log.warn('getOpenedDataChannels is not implement in Janus connector');

      return [];
    }
  });
