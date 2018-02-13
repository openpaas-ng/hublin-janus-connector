'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The janusClient factory', function() {
  var $rootScope, janusClient, error, pluginHandle, roomId, JANUS_CONSTANTS;

  beforeEach(function() {
    error = new Error('meow, I failed 😿');
    pluginHandle = {
      send: sinon.spy()
    };
    roomId = 34000;

    angular.mock.module('hublin.janus.connector', function() {});

    angular.mock.inject(function(_$rootScope_, _janusClient_, _JANUS_CONSTANTS_) {
      $rootScope = _$rootScope_;
      janusClient = _janusClient_;
      JANUS_CONSTANTS = _JANUS_CONSTANTS_;
    });
  });

  describe('The isRoomExists function', function() {
    it('should call call janus correctly', function() {
      janusClient(pluginHandle).isRoomExists(roomId);

      expect(pluginHandle.send).to.have.been.calledWith({
        message: {
          request: JANUS_CONSTANTS.exists,
          room: roomId
        },
        success: sinon.match.func,
        error: sinon.match.func
      });
    });

    it('should resolve with true when room exists', function(done) {
      var exists = true;
      var promise = janusClient(pluginHandle).isRoomExists(roomId);

      pluginHandle.send.firstCall.args[0].success({ exists: exists});
      promise.then(function(result) {
        expect(result).to.be.true;
        done();
      })
      .catch(done);
      $rootScope.$digest();
    });

    it('should resolve with false when room exists does not send back result', function(done) {
      var promise = janusClient(pluginHandle).isRoomExists(roomId);

      pluginHandle.send.firstCall.args[0].success();
      promise.then(function(result) {
        expect(result).to.be.undefined;
        done();
      })
      .catch(done);
      $rootScope.$digest();
    });

    it('should resolve with false when room does not exists', function(done) {
      var exists = false;
      var promise = janusClient(pluginHandle).isRoomExists(roomId);

      pluginHandle.send.firstCall.args[0].success({ exists: exists});
      promise.then(function(result) {
        expect(result).to.be.false;
        done();
      })
      .catch(done);
      $rootScope.$digest();
    });

    it('should reject on error', function(done) {
      var promise = janusClient(pluginHandle).isRoomExists(roomId);

      pluginHandle.send.firstCall.args[0].error(error);
      promise.then(function() {
        done(new Error('Should not be called'));
      })
      .catch(function(err) {
        expect(err).to.equal(error);
        done();
      });
      $rootScope.$digest();
    });
  });

  describe('The createRoom function', function() {
    it('should call call janus correctly', function() {
      janusClient(pluginHandle).createRoom(roomId);

      expect(pluginHandle.send).to.have.been.calledWith({
        message: {
          request: JANUS_CONSTANTS.create,
          room: roomId,
          publishers: JANUS_CONSTANTS.max_publishers
        },
        success: sinon.match.func,
        error: sinon.match.func
      });
    });

    it('should resolve on success', function(done) {
      var promise = janusClient(pluginHandle).createRoom(roomId);

      pluginHandle.send.firstCall.args[0].success();
      promise.then(function() {
        done();
      })
      .catch(done);
      $rootScope.$digest();
    });

    it('should reject on error', function(done) {
      var promise = janusClient(pluginHandle).createRoom(roomId);

      pluginHandle.send.firstCall.args[0].error(error);
      promise.then(function() {
        done(new Error('Should not be called'));
      })
      .catch(function(err) {
        expect(err).to.equal(error);
        done();
      });
      $rootScope.$digest();
    });
  });
});
