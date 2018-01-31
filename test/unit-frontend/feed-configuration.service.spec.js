'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The JanusFeedConfiguration factory', function() {
  var $rootScope, JanusFeedConfiguration, janusConfig, error, pluginHandle, jsSessionEstablishmentProtocol;

  beforeEach(function() {
    error = new Error('meow, I failed 😿');
    pluginHandle = {
      send: sinon.spy()
    };
    jsSessionEstablishmentProtocol = 'This is some WEBRTC level stuff';

    angular.mock.module('hublin.janus.connector', function() {});

    angular.mock.inject(function(_$rootScope_, _JanusFeedConfiguration_) {
      $rootScope = _$rootScope_;
      JanusFeedConfiguration = _JanusFeedConfiguration_;
    });

    janusConfig = new JanusFeedConfiguration(pluginHandle, jsSessionEstablishmentProtocol);
  });

  describe('The configure function', function() {
    it('should send message to janus and resolve', function(done) {
      var options = { bitrate: 10 };
      var promise = janusConfig.configure(options);

      pluginHandle.send.firstCall.args[0].success();
      promise.then(function() {
        expect(pluginHandle.send).to.have.been.calledWith({
          message: {
            request: 'configure',
            bitrate: options.bitrate
          },
          jsep: jsSessionEstablishmentProtocol,
          success: sinon.match.func,
          error: sinon.match.func
        });
        done();
      }).catch(done);
      $rootScope.$digest();
    });

    it('should send message to janus and reject if janus sends back error', function(done) {
      var options = { bitrate: 10 };
      var promise = janusConfig.configure(options);

      pluginHandle.send.firstCall.args[0].error(error);
      promise.then(function() {
        done(new Error('Should not be called'));
      }).catch(function(err) {
        expect(err).to.equal(error);
        expect(pluginHandle.send).to.have.been.calledWith({
          message: {
            request: 'configure',
            bitrate: options.bitrate
          },
          jsep: jsSessionEstablishmentProtocol,
          success: sinon.match.func,
          error: sinon.match.func
        });
        done();
      });
      $rootScope.$digest();
    });
  });
});
