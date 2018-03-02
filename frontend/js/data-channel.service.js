(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector').factory('JanusDataChannel', JanusDataChannel);

  function JanusDataChannel(
    $log,
    $q,
    currentConferenceState,
    janusClient,
    janusFeedRegistry,
    _,
    JANUS_CONSTANTS
  ) {
    return function(janusInstance, display, roomId, feedId) {
      var self = this;
      var dataChannel = null;
      var isOpen = false;

      self.transactions = {};
      self.remoteIds = [];
      self.feedId = feedId;
      self.isDataChannelOpen = isDataChannelOpen;
      self.roomId = roomId;
      self.sendData = sendData;
      self.sendStatus = sendStatus;

      this.init = function(options) {
        var defer = $q.defer();

        options = options || {};
        self.onRemoteJoin = options.onRemoteJoin || function(id) { $log.debug(id, 'joined the room'); };
        self.onRemoteLeave = options.onRemoteLeave || function(id) { $log.debug(id, 'left the room'); };
        self.onRemoteData = options.onRemoteData || function(id) { $log.debug(id, 'sent data'); };

        janusInstance.attach({
          plugin: JANUS_CONSTANTS.textroom,
          success: onSuccess,
          error: onError,
          onmessage: _pluginHandleOnMessage,
          ondataopen: _onDataOpenHandle,
          ondata: _onDataHandle
        });

        function onSuccess(pluginHandle) {
          var body = { request: JANUS_CONSTANTS.setup };

          dataChannel = pluginHandle;
          $log.debug('Plugin attached! (' + dataChannel.getPlugin() + ', id=' + dataChannel.getId() + ')');
          $log.debug('Sending message (' + JSON.stringify(body) + ')');

          dataChannel.send({ message: body});
          defer.resolve();
        }

        function onError(error) {
          $log.error('Error while attaching plugin textroom for DataChannel', error);
          defer.reject(error);
        }

        return defer.promise;
      };

      function isDataChannelOpen() {
        return isOpen;
      }

      function sendData(type, data, remoteFeedId) {
        var defer = $q.defer();

        if (!isOpen) {
          defer.reject(new Error('DataChannel is closed, can not send data'));
        } else {
          $log.debug('Send data on janus feed', dataChannel.id, 'on room', roomId, data);

          data.type = type;

          var transaction = getTransactionId();
          var message = {
            textroom: JANUS_CONSTANTS.message,
            transaction: transaction,
            room: roomId,
            text: JSON.stringify(data)
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
        var transactionId = getTransactionId();

        janusClient(dataChannel)
          .assertRoomExists(roomId)
          .then(function() {
            self.transactions[transactionId] = transaction;
            var register = {
              textroom: JANUS_CONSTANTS.join,
              transaction: transactionId,
              room: roomId,
              username: feedId.toString(),
              display: display
            };

            dataChannel.data({
              text: JSON.stringify(register),
              success: function() {
                $log.debug('Registering on DataChannel success');
              },
              error: function(error) {
                $log.error('Error while registering on dataChannel', error);
              }
            });
          });

          function transaction() {
            $log.debug('Transaction on join is now complete', transactionId);
          }
      }

      function _onDataHandle(data) {
        $log.debug('Receive data from the DataChannel', data);

        var msg = JSON.parse(data);
        var textroom = msg.textroom;
        var transaction = msg.transaction;

        // handle only my transactions
        if (transaction && self.transactions[transaction]) {
          self.transactions[transaction](msg);
          delete self.transactions[transaction];

          return;
        }

        if (textroom === 'join') {
          $log.debug('Someone is joining the room', msg);
          janusFeedRegistry.addRemoteDataChannel(msg.username);
          self.onRemoteJoin(msg.username);
        } else if (textroom === 'leave') {
          $log.debug('Someone is leaving the room', msg);
          janusFeedRegistry.removeRemoteDataChannel(msg.username);
          self.onRemoteLeave(msg.username);
        } else if (textroom === 'message' && msg.text) {
          var msgData = JSON.parse(msg.text);
          var remoteFeedId = janusFeedRegistry.getFeedMapping(msg.from);

          if (!remoteFeedId) {
            $log.debug('Can not find remote feed id (probably message from local which is sent back from janus)', msg.from);
          }

          self.onRemoteData(msg.from, msgData);
          // TODO: This should be a peer listener like any other, handling data on special msgType
          remoteFeedId && msgData.status && currentConferenceState.updateAttendeeByRtcid(remoteFeedId, msgData.status);
        } else {
          $log.debug('Unhandled action', textroom);
        }
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
    };
  }
})(angular);
