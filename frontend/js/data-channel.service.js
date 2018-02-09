(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector').factory('JanusDataChannel', JanusDataChannel);

  function JanusDataChannel(
    $log,
    $q,
    janusClient,
    _,
    JANUS_CONSTANTS
  ) {
    return function(janusInstance, display, roomId, feedId) {
      var self = this;
      var dataChannel = null;
      var isOpen = false;

      self.feedId = feedId;
      self.isDataChannelOpen = isDataChannelOpen;
      self.roomId = roomId;
      self.sendData = sendData;
      self.sendStatus = sendStatus;

      _init();

      function isDataChannelOpen() {
        return isOpen;
      }

      function sendData(type, text, remoteFeedId) {
        var defer = $q.defer();

        if (!isOpen) {
          defer.reject(new Error('DataChannel is closed, can not send data'));
        } else {
          $log.debug('Send data on janus feed', dataChannel.id, 'on room', roomId, text);

          type = type || JANUS_CONSTANTS.message;

          var transaction = getTransactionId();
          var message = {
            type: type,
            textroom: type,
            transaction: transaction,
            room: roomId,
            text: JSON.stringify(text)
          };

          if (remoteFeedId) {
            message.to = String(remoteFeedId);
          }

          dataChannel.data({
            text: JSON.stringify(message),
            success: function() {
              $log.debug('DataChannel sent message with success');
              defer.resolve();
            },
            error: function(error) {
              $log.error('Error while DataChannel sent message', error);
              defer.reject(error);
            }
          });
        }

        return defer.promise;
      }

      function sendStatus() {
        $log.warn('DataChannel sendStatus is not implemented');
      }

      function _setDataChannelStatus(status) {
        isOpen = !!status;
      }

      function _onDataOpenHandle() {
        $log.debug('The DataChannel is available!');
        _setDataChannelStatus(true);
        _register();
      }

      function _register() {
        janusClient(dataChannel)
          .assertRoomExists(roomId)
          .then(function() {
            var register = {
              textroom: JANUS_CONSTANTS.join,
              transaction: getTransactionId(),
              room: roomId,
              username: feedId.toString(),
              display: display
            };

            dataChannel.data({
              text: JSON.stringify(register),
              success: function() { $log.debug('Registering on DataChannel success'); },
              error: function(error) { $log.error('Error while registering on dataChannel', error); }
            });
          });
        }

      function _onDataHandle(data) {
        //TODO need to handle all type of data, ou of scope
        var msg = JSON.parse(data);

        if (msg.text) {
          msg.text = JSON.parse(msg.text);
        }

        $log.debug('Receive data from the DataChannel', msg);
      }

      function _subscribe(jsep) {
        dataChannel.createAnswer(
          {
            jsep: jsep,
            media: { audio: false, video: false, data: true },
            success: function(jsep) {
              $log.debug('DataChannel got SDP', jsep);

              dataChannel.send({
                message: { request: JANUS_CONSTANTS.start },
                jsep: jsep
              });
            },
            error: function(error) {
              $log.error('WebRTC error:', error);
            },
            ondata: _onDataHandle
          });
      }

      function _pluginHandleSuccess(pluginHandle) {
        dataChannel = pluginHandle;

        $log.debug('Plugin attached! (' + dataChannel.getPlugin() + ', id=' + dataChannel.getId() + ')');

        var body = { request: JANUS_CONSTANTS.setup };

        $log.debug('Sending message (' + JSON.stringify(body) + ')');
        dataChannel.send({ message: body});
      }

      function _pluginHandleError(error) {
        $log.error('Error while attaching plugin textroom for DataChannel', error);
      }

      function _pluginHandleOnMessage(msg, jsep) {
        $log.debug('Receive message from the DataChannel', msg);

        if (msg.error) {
          $log.error('Receive message error from the DataChannel', msg.error);
        }
        if (jsep) {
          _subscribe(jsep);
        }
      }

      function getTransactionId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }

      function _init() {
        janusInstance.attach({
          plugin: JANUS_CONSTANTS.textroom,
          success: _pluginHandleSuccess,
          error: _pluginHandleError,
          onmessage: _pluginHandleOnMessage,
          ondataopen: _onDataOpenHandle,
          ondata: _onDataHandle
        });
      }
    };
  }
})(angular);
