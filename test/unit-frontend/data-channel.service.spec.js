'use strict';

/* global chai */

var expect = chai.expect;

describe('The JanusDataChannel factory', function() {
  var $q, $rootScope;
  var JanusDataChannel, janusConfigurationService, DataChannel, Janus, janusInstance, roomId, id, displayName;

  beforeEach(function() {
    Janus = window.Janus;
    Janus.init({
      debug: false,
      callback: function() {}
    });
    roomId = 34000;
    id = 'the user id';
    displayName = 'James Bond';

    angular.mock.module('hublin.janus.connector', function() {});

    angular.mock.inject(function(_$q_, _$rootScope_, _JanusDataChannel_, _janusConfigurationService_) {
      $q = _$q_;
      $rootScope = _$rootScope_;
      JanusDataChannel = _JanusDataChannel_;
      janusConfigurationService = _janusConfigurationService_;
    });

  });

  function getJanusInstance() {
    var defer = $q.defer();

    if (janusInstance) {
       return defer.resolve(janusInstance);
    }

    var janusConfiguration = janusConfigurationService.getConferenceConfiguration({
      configuration: {
        hosts: [{
          type: 'janus',
          url: `http://${window.TEST_ENV_CONSTANT.JANUS_URL}:8088/janus`
      }]
      }
    });

    janusInstance = new Janus({
      server: janusConfiguration.url,
      success: function() {
        defer.resolve();
        $rootScope.$digest();
      },
      error: function(err) {
        defer.reject(err);
        $rootScope.$digest();
      }
    });

    return defer.promise;
  }

  describe('The initialization', function() {
    it('should init DataChannel', function(done) {
      getJanusInstance()
        .then(function() {
          DataChannel = new JanusDataChannel(janusInstance, displayName, roomId, id);

          expect(DataChannel.feedId).to.equal(id);
          expect(DataChannel.roomId).to.equal(roomId);
          expect(DataChannel.isDataChannelOpen()).to.be.false;

          done();
        })
        .catch(done);
    });
  });
});
