(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector')
    .factory('janusRTCAdapter', janusRTCAdapter);

  function janusRTCAdapter(
    $q,
    $log,
    currentConferenceState,
    janusFactory,
    JanusFeed,
    janusFeedRegistry,
    session,
    janusConfigurationService,
    LOCAL_VIDEO_ID,
    REMOTE_VIDEO_IDS,
    JANUS_CONSTANTS
  ) {
    var janus, plugin;
    var videoEnabled = true;
    // TODO for janus
    var canEnumerateDevices = true;
    var NOT_CONNECTED = 0;
    var BECOMING_CONNECTED = 1;
    var IS_CONNECTED = 2;
    var Janus = janusFactory.get();

    Janus.init({
      debug: true,
      callback: function() {
        $log.info('Janus initialized');
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
      handleError: handleError,
      handleEventMessage: handleEventMessage,
      handleJoinedMessage: handleJoinedMessage,
      handleLocalStream: handleLocalStream,
      handleOnMessage: handleOnMessage,
      leaveRoom: leaveRoom,
      subscribeToRemoteFeed: subscribeToRemoteFeed,
      isVideoEnabled: isVideoEnabled,
      publishOwnFeed: publishOwnFeed,
      setPlugin: setPlugin,
      setSfu: setSfu,
      myRtcid: myRtcid,
      // NOT IMPLEMENTED (BUT MUST!)
      setVideoEnabled: setVideoEnabled,
      setGotMedia: setGotMedia,
      configureBandwidth: configureBandwidth,
      enableVideo: enableVideo,
      addDisconnectCallback: addDisconnectCallback,
      removeDisconnectCallback: removeDisconnectCallback,
      sendData: sendData,
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

    function getPlugin() {
      return plugin;
    }

    function setPlugin(_plugin) {
      plugin = _plugin;
    }

    function setSfu(_selectiveForwardingUnit) {
      janus = _selectiveForwardingUnit;
    }

    function getSfu() {
      return janus;
    }

    function handleSuccessAttach(pluginHandle) {
      setPlugin(pluginHandle);

      pluginHandle.send({
        message: {
          request: JANUS_CONSTANTS.exists,
          room: session.conference.roomId
        },
        success: function(janusResponse) {
          if (!janusResponse || !janusResponse.exists) {
            $log.info('Creating room: ' + janusResponse.room);

            pluginHandle.send({
              message: {
                request: JANUS_CONSTANTS.create,
                room: janusResponse.room
              },
              success: joinRoom
            });
          } else {
            joinRoom(janusResponse);
          }
        }
      });

      function joinRoom(janusResponse) {
        var username = session.getUsername();

        $log.info('Joining room: ' + janusResponse.room);
        pluginHandle.send({
          message: {
            request: JANUS_CONSTANTS.join,
            room: janusResponse.room,
            ptype: JANUS_CONSTANTS.publisher,
            display: username
          }
        });
      }
    }

    function handleLocalStream(localStream) {
      var element = currentConferenceState.getVideoElementById(LOCAL_VIDEO_ID).get(0);

      Janus.attachMediaStream(element, localStream);
    }

    function leaveRoom() {
      $log.info('leaving a room');
      plugin.send({
        message: {
          request: JANUS_CONSTANTS.unpublish
        }
      });
      $log.info('unpublish request is sent');
    }

    function publishOwnFeed() {
      plugin.createOffer({
        //these boolean variables are default settings, until we implement a dynamic configuration
        //the user receive and send both audio and video
        media: { audioRecv: true, videoRecv: true, audioSend: true, videoSend: true },
        success: function(jsSessionEstablishmentProtocol) {
          $log.info('Got publisher SDP!');
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
          $log.error('WebRTC error:', error);
        }
      });
    }

    function subscribeToRemoteFeeds(list) {
      $log.info('Subscribe to remote feeds', list);

      list.forEach(function(item) {
        subscribeToRemoteFeed(item.id, item.display);
      });
    }

    function unpublishFeed(msg) {
      $log.info('Unpublishing feed', msg);
      var unpublishedFeed = janusFeedRegistry.get(msg.unpublished);

      if (!unpublishedFeed) {
        $log.error('Can not find feed to unpublish', msg);

        return;
      }

      currentConferenceState.removeAttendee(unpublishedFeed.rfindex);
      unpublishedFeed.destroy();
      janusFeedRegistry.remove(unpublishedFeed.id);
    }

    function handleEventMessage(msg) {
      if (msg.publishers) {
        subscribeToRemoteFeeds(msg.publishers);
      } else if (msg.unpublished) {
        unpublishFeed(msg);
      }
    }

    function handleJoinedMessage(msg) {
      currentConferenceState.pushAttendee(0, msg.id, session.getUserId(), session.getUsername());

      publishOwnFeed();

      msg.publishers && subscribeToRemoteFeeds(msg.publishers);
    }

    function handleError(error) {
      $log.error('Error: ' + error);
    }

    function handleOnMessage(msg, jsSessionEstablishmentProtocol) {
      $log.info('Got a message (publisher)');
      if (msg) {
        switch (msg.videoroom) {
          case JANUS_CONSTANTS.joined:
            handleJoinedMessage(msg);
            break;
          case JANUS_CONSTANTS.event:
            handleEventMessage(msg);
            break;
          default:
            $log.info('Event is not supported', msg.videoroom);
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

    function subscribeToRemoteFeed(id, display) {
      $log.info('Subscribing to remote feed', id, display);
      var feed;

      janus.attach({
        plugin: JANUS_CONSTANTS.videoroom,
        success: handleRemoteSuccess,
        error: handleOnRemoteError,
        onremotestream: handleOnRemoteStream,
        onmessage: handleOnRemoteMessage
      });

      function handleRemoteSuccess(pluginHandle) {
        $log.info('Attaching a new remote feed with id', id);

        feed = new JanusFeed(pluginHandle, session.conference.roomId, id, display);
        feed.listen();
      }

      function handleOnRemoteError(err) {
        $log.error('Error while attaching remote stream for id', id, err);
      }

      function handleOnRemoteStream(stream) {
        var element = currentConferenceState.getVideoElementById(REMOTE_VIDEO_IDS[feed.rfindex - 1]);

        $log.info('Attaching remote stream to element', element);
        Janus.attachMediaStream(element.get(0), stream);
        feed.setStream(stream);
      }

      function handleOnRemoteMessage(msg, jsSessionEstablishmentProtocol) {
        $log.info('Handling remote message', msg);
        if (jsSessionEstablishmentProtocol) {
          feed.subscribe(jsSessionEstablishmentProtocol);
        }
        if (msg && msg.videoroom === JANUS_CONSTANTS.attached) {
          handleAttachedMessage(msg);
        }
      }

      function handleAttachedMessage() {
        var feeds = janusFeedRegistry.getAll();

        // TODO: Find a better way to find the right index
        // this is length + 1 until we store the current feed in the registery also.
        feed.rfindex = feeds.length + 1;
        currentConferenceState.pushAttendee(feed.rfindex, feed.id, null, display);
        janusFeedRegistry.add(feed);
      }
    }

    function connect() {
      var conference = currentConferenceState.conference;
      var conferenceJanusConfig = janusConfigurationService.getConferenceConfiguration(conference);

      janus = new Janus({
        server: conferenceJanusConfig.url,
        iceServers: conference.iceServers,
        success: function() {
          $log.info('Janus session created, attaching videoroom...');
          janus.attach({
            plugin: JANUS_CONSTANTS.videoroom,
            success: handleSuccessAttach,
            error: onAttachError,
            onmessage: handleOnMessage,
            onlocalstream: handleLocalStream
          });
        },
        error: onJanusInstanceError
      });

      function onAttachError(err) {
        $log.error('Error on janus.attach after instanciating Janus', err);
      }

      function onJanusInstanceError(err) {
        $log.error('Error while instanciating Janus', err);
      }
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
      return getPlugin() && getPlugin().getId();
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
  }
})(angular);
