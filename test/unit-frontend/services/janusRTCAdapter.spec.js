'use strict';

var expect = chai.expect;
var sinon = sinon;

describe('janusAdapter service', function() {
  var session, janusRTCAdapter, janusFactory;

  beforeEach(function() {
    angular.mock.module('hublin.janus.connector', function($provide) {
      $provide.value('session', session);
      $provide.value('janusFactory', janusFactory);
    });
    session = {
      getUsername: function() { return 'Woot';}
    };
    janusFactory = {};
    angular.mock.inject(function(_janusRTCAdapter_) {
      janusRTCAdapter = _janusRTCAdapter_;
    });

  });

  describe('The connect method', function() {
    it('should call the init method of Janus', function() {
      janusFactory.get = function() {
        var Janus = {};

        Janus.init = function(object) {
          expect(object.debug).to.be.true;
          expect(object.callback).to.be.a('function');
        };

        return Janus;
      };

      janusRTCAdapter.connect();
    });

    it('should create a new Janus object', function() {
      janusFactory.get = function() {
        var Janus = function(object) {
          expect(object.server).to.equal('http://localhost:8088/janus');
          expect(object.success).to.be.a('function');
          expect(object.error).to.be.a('function');
        };

        Janus.init = function(object) {
          object.callback();
        };

        return Janus;
      };

      janusRTCAdapter.connect();
    });

    it('should call janus.attach if Janus session has been successfully created', function(done) {
      janusFactory.get = function() {
        var Janus = function(object) {
          this.attach = function(object) {
            expect(object.plugin).to.equal('janus.plugin.videoroom');
            expect(object.success).to.be.a('function');
            expect(object.error).to.be.a('function');
            done();
          };
          //Timeout is necessary because the janus.js API is built that way :
          //the Janus function builds the object, then it calls the success callback which in turn calls the object that was just built.
          //if I do not add the timeout the success callback is executed before the object has been created
          setTimeout(object.success, 0);
        };

        Janus.init = function(object) {
          object.callback();
        };
        Janus.debug = function() {};

        return Janus;
      };

      janusRTCAdapter.connect();
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
