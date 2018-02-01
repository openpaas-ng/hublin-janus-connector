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
    janusClient,
    janusFeedRegistry,
    session,
    janusConfigurationService,
    LOCAL_VIDEO_ID,
    REMOTE_VIDEO_IDS,
    JANUS_CONSTANTS,
    JANUS_FEED_TYPE
  ) {
    var janus;
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
      // PARTIALLY IMPLEMENTED
      leaveRoom: leaveRoom,
      isVideoEnabled: isVideoEnabled,
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

    function leaveRoom() {
      var localFeed = janusFeedRegistry.getLocalFeed();

      if (!localFeed) {
        $log.warn('Can not leave room if local feed is not created');

        return;
      }

      localFeed.leave();
    }

    function subscribeToRemoteFeeds(list) {
      $log.info('Subscribe to remote feeds', list);

      list.forEach(function(item) {
        subscribeToRemoteFeed(item.id, item.display);
      });
    }

    function unpublishFeed(msg) {
      $log.info('Unpublishing a remote feed', msg);
      var unpublishedFeed = janusFeedRegistry.get(msg.unpublished);

      if (!unpublishedFeed) {
        $log.error('Can not find feed to unpublish', msg);

        return;
      }

      currentConferenceState.removeAttendee(unpublishedFeed.rfindex);
      unpublishedFeed.destroy();
      janusFeedRegistry.remove(unpublishedFeed.id);
    }

    function setVideoEnabled(enabled) {
      videoEnabled = enabled;
    }

    function isVideoEnabled() {
      return videoEnabled;
    }

    function subscribeToRemoteFeed(id, display) {
      $log.info('Subscribing to remote feed', id, display);
      var remoteFeed;

      janus.attach({
        plugin: JANUS_CONSTANTS.videoroom,
        success: handleRemoteSuccess,
        error: handleOnRemoteError,
        onremotestream: handleOnRemoteStream,
        onmessage: handleOnRemoteMessage
      });

      function handleRemoteSuccess(pluginHandle) {
        $log.info('Attaching a new remote feed with id', id);

        remoteFeed = new JanusFeed(pluginHandle, session.conference.roomId, id, display, JANUS_FEED_TYPE.remote);
        remoteFeed.listen();
      }

      function handleOnRemoteError(err) {
        $log.error('Error while attaching remote stream for id', id, err);
      }

      function handleOnRemoteStream(stream) {
        var element = currentConferenceState.getVideoElementById(REMOTE_VIDEO_IDS[remoteFeed.rfindex - 1]);

        $log.info('Attaching remote stream to element', element);
        Janus.attachMediaStream(element.get(0), stream);
        remoteFeed.setStream(stream);
      }

      function handleOnRemoteMessage(msg, jsSessionEstablishmentProtocol) {
        $log.info('Handling remote message', msg);
        if (jsSessionEstablishmentProtocol) {
          remoteFeed.subscribe(jsSessionEstablishmentProtocol);
        }
        if (msg && msg.videoroom === JANUS_CONSTANTS.attached) {
          handleAttachedMessage(msg);
        }
      }

      function handleAttachedMessage() {
        var feeds = janusFeedRegistry.getAll();

        // TODO: Find a better way to find the right index
        // this is length + 1 until we store the current feed in the registery also.
        remoteFeed.rfindex = feeds.length + 1;
        currentConferenceState.pushAttendee(remoteFeed.rfindex, remoteFeed.id, null, display);
        janusFeedRegistry.add(remoteFeed);
      }
    }

    function connect() {
      connectToJanus().then(joinConference);
    }

    function connectToJanus() {
      var defer = $q.defer();

      if (janus) {
        return defer.resolve();
      }

      var conference = currentConferenceState.conference;
      var conferenceJanusConfig = janusConfigurationService.getConferenceConfiguration(conference);

      janus = new Janus({
        server: conferenceJanusConfig.url,
        iceServers: conference.iceServers,
        success: function() {
          defer.resolve();
        },
        error: function(err) {
          $log.error('Error while instanciating Janus', err);
          defer.reject(err);
        }
      });

      return defer.promise;
    }

    function joinConference() {
      var localFeed = null;

      $log.info('Attaching videoroom to join conference...');
      janus.attach({
        plugin: JANUS_CONSTANTS.videoroom,
        success: onSuccess,
        error: onError,
        onmessage: onMessage,
        onlocalstream: onLocalStream
      });

      function onSuccess(pluginHandle) {
        var id = pluginHandle.id;
        var display = session.getUsername();
        var roomId = session.conference.roomId;

        localFeed = new JanusFeed(pluginHandle, session.conference.roomId, id, display, JANUS_FEED_TYPE.local);
        janusClient(pluginHandle).assertRoomExists(roomId).then(localFeed.join, onError);
      }

      function onError(err) {
        $log.error('Can not attach to videoroom to join conference', err);
      }

      function onMessage(msg, jsSessionEstablishmentProtocol) {
        if (msg) {
          $log.info('Message on room', msg.videoroom);
          switch (msg.videoroom) {
            case JANUS_CONSTANTS.joined:
              // janus confirmed we joined the rooom
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
          localFeed.handleRemoteJsep(jsSessionEstablishmentProtocol);
        }
      }

      function handleJoinedMessage(msg) {
        // TODO: handle publish error and do not push attendee if we are not ready to...
        localFeed.publish();
        currentConferenceState.pushAttendee(0, msg.id, session.getUserId(), session.getUsername());
        janusFeedRegistry.setLocalFeed(localFeed);

        msg.publishers && subscribeToRemoteFeeds(msg.publishers);
      }

      function handleEventMessage(msg) {
        $log.debug('Message on room', msg);
        if (msg.publishers) {
          subscribeToRemoteFeeds(msg.publishers);
        } else if (msg.unpublished) {
          unpublishFeed(msg);
        } else if (msg.leaving) {
          $log.info('leaving (not implemented)', msg.leaving);
        } else if (msg.configured) {
          $log.info('configured (not implemented)', msg.leaving);
        } else if (msg.error) {
          $log.error('Janus server sends back an error', msg.error);
        }
      }

      function onLocalStream(localStream) {
        var element = currentConferenceState.getVideoElementById(LOCAL_VIDEO_ID).get(0);

        localFeed.setStream(localStream);
        Janus.attachMediaStream(element, localStream);
      }
    }

    function setGotMedia(callback) {
      $log.warn('setGotMedia is not implemented in Janus connector');
      callback();
    }

    function configureBandwidth(bitRates) {
      $log.warn('configureBandwidth is not implemented in Janus connector', bitRates);
    }

    function enableVideo(enabled) {
      var localFeed = janusFeedRegistry.getLocalFeed();

      localFeed.toggleVideo(enabled);
    }

    function addDisconnectCallback() {
      $log.warn('addDisconnectCallback is not implement in Janus connector');
    }

    function sendData(easyrtcid, msgType, data, ackhandler) {
      $log.warn('sendData is not implement in Janus connector', easyrtcid, msgType, data, ackhandler);
    }

    function myRtcid() {
      var localFeed = janusFeedRegistry.getLocalFeed();

      return localFeed && localFeed.id;
    }

    function performCall(otherRTCid) {
      $log.warn('performCall is not implement in Janus connector', otherRTCid);
    }

    function enableMicrophone(enabled) {
      var localFeed = janusFeedRegistry.getLocalFeed();

      localFeed.toggleMicrophone(enabled);
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
