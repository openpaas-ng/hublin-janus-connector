'use strict';

var expect = chai.expect;
var sinon = sinon;

describe('janusAdapter service', function() {
  var session, janusRTCAdapter;

  beforeEach(function() {
    angular.mock.module('hublin.janus.connector', function($provide) {
      $provide.value('session', session);
    });
    session = {
      getUsername: function() { return 'Woot';}
    };
    angular.mock.inject(function(_janusRTCAdapter_) {
      janusRTCAdapter = _janusRTCAdapter_;
    });
  });

  describe('handleSuccessAttach method', function() {
    var pluginHandle = { };

    it('should send message', function() {
      pluginHandle.send = sinon.spy();
      janusRTCAdapter.handleSuccessAttach(pluginHandle);

      expect(pluginHandle.send).to.have.been.calledWith({ message: { request: 'join', room: 1234, ptype: 'publisher', display: 'Woot' } });
    });
  });
});
