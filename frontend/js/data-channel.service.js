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

          text.type = type;

          var transaction = getTransactionId();
          var message = {
            textroom: JANUS_CONSTANTS.message,
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
        var action = msg.textroom;
        var transaction = msg.transaction;

        // handle only my transactions
        if (transaction && self.transactions[transaction]) {
          self.transactions[transaction](msg);
          delete self.transactions[transaction];

          return;
        }

        if (action === 'join') {
          $log.debug('Someone is joining the room', data);
          /* data =
          {
            "textroom": "join",
            "room": 117,
            "username": "5108441650714721",
            "display": "Christophe"
          }
          // TODO: Call the adapter addDataChannelOpenListener handler for remote only (not me)
        } else if (action === 'leave') {
          $log.debug('Someone is leaving the room', data);
          /* data =
          {
            "textroom": "leave",
            "room": 116,
            "username": "5178046444405845"
         }
         */
          // TODO: Call the adapter addDataChannelCloseListener handler for remote only (not me)
        } else if (action === 'message' && msg.text) {
          var text = JSON.parse(msg.text);
          var localFeedId = janusFeedRegistry.getFeedMapping(msg.from);

          localFeedId && currentConferenceState.updateAttendeeByRtcid(localFeedId, text.status);
        } else if (action === 'success') {
          // DROP IT
        } else {
          $log.debug('Unsupported action', action);
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
