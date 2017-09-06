'use strict';

var expect = chai.expect;
var sinon = sinon;

describe('janusAdapter service', function() {
  var currentConferenceState, janusRTCAdapter, janusFactory, plugin, session, LOCAL_VIDEO_ID;

  beforeEach(function() {
    angular.mock.module('hublin.janus.connector', function($provide) {
      $provide.value('currentConferenceState', currentConferenceState);
      $provide.value('janusFactory', janusFactory);
      $provide.value('session', session);
      $provide.value('LOCAL_VIDEO_ID', LOCAL_VIDEO_ID);
    });
    LOCAL_VIDEO_ID = 'video-thumb0';
    session = {
      getUsername: function() { return 'Woot';},
      getUserId: function() { return '0000'; }
    };
    plugin = {
      createOffer: function() {}
    };
    janusFactory = {};
    currentConferenceState = {};
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
    var pluginHandle = {};

    it('should send message', function() {
      pluginHandle.send = sinon.spy();
      janusRTCAdapter.handleSuccessAttach(pluginHandle);

      expect(janusRTCAdapter.getPlugin()).to.be.equal(pluginHandle);
      expect(janusRTCAdapter.getPlugin().send).to.have.been.calledWith({ message: { request: 'join', room: 1234, ptype: 'publisher', display: 'Woot' } });
    });
  });

  describe('The handle error method', function() {
    it('should call Janu debug', function() {
      var Janus = {};
      janusFactory.get = function() {
        Janus.debug = sinon.spy();
        return Janus;
      };

      janusRTCAdapter.lazyJanusInstance();
      janusRTCAdapter.handleError('error');

      expect(Janus.debug).to.have.been.calledWith('Error: error');
    });
  });

  describe('The handleJoinedMessage method', function() {
    it('should handle message with event type == joined', function() {
      var msg = { id: 'LoL' };

      plugin.createOffer = sinon.spy();
      currentConferenceState.pushAttendee = sinon.spy();
      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.handleJoinedMessage(msg);

      expect(plugin.createOffer).to.be.called;
      expect(currentConferenceState.pushAttendee).to.have.been.calledWith(0, 'LoL', '0000', 'Woot');
    });
  });

  describe('The handleLocalStream method', function() {
    it('should call Janus attachMediaStream', function() {
      var stream = 'stream';
      var Janus = {};
      var spy;
      janusFactory.get = function() {
        Janus.attachMediaStream = sinon.spy();
        return Janus;
      };

      currentConferenceState.getVideoElementById = function() {
        var element = {
          get: function(value) {
            return 'YoYo';
          }
        };
        return element;
      };

      spy = sinon.spy(currentConferenceState, 'getVideoElementById');
      janusRTCAdapter.handleLocalStream(stream);

      expect(spy).to.have.been.calledWith(LOCAL_VIDEO_ID);
      expect(Janus.attachMediaStream).to.have.been.calledWith('YoYo', 'stream');
    });
  });

  describe('The handleOnMessage method', function() {
    beforeEach(function() {
      janusFactory.get = function() {
        var Janus = {};
        Janus.debug = function() {};
        return Janus;
      };
      currentConferenceState.pushAttendee = sinon.spy();
      janusRTCAdapter.lazyJanusInstance();
    });

    it('should call handleJoined Message if event is joined', function() {
      var msg = { videoroom: 'joined'};
      var jsSessionEstablishmentProtocol = null;

      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.handleOnMessage(msg, jsSessionEstablishmentProtocol);

      expect(currentConferenceState.pushAttendee).to.be.called;
    });

    it('should NOT call handleJoined Message if event is not joined', function() {
      var msg = null;
      var jsSessionEstablishmentProtocol  = null;

      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.handleOnMessage(msg, jsSessionEstablishmentProtocol);

      expect(currentConferenceState.pushAttendee).not.to.be.called;
    });

    it('should call handleRemoteJsep when jsSessionEstablishmentProtocol is defined and not null', function() {
      var msg = null;
      var jsSessionEstablishmentProtocol  = {};

      plugin.handleRemoteJsep = sinon.spy();
      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.handleOnMessage(msg, jsSessionEstablishmentProtocol);

      expect(plugin.handleRemoteJsep).to.have.been.calledWith({jsep: jsSessionEstablishmentProtocol});
    });

    it('should  Not call handleRemoteJsep when jsSessionEstablishmentProtocol is undefined or null', function() {
      var msg = null;
      var jsSessionEstablishmentProtocol  = null;

      plugin.handleRemoteJsep = sinon.spy();
      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.handleOnMessage(msg, jsSessionEstablishmentProtocol);

      expect(plugin.handleRemoteJsep).not.to.be.called;
    });
  });

  describe('publishOwnFeed method', function() {
    it('should call Offer with Media object ,success & error callbacks', function() {

      plugin.createOffer = function(object) {
        var msg = { audioRecv: true, videoRecv: true, audioSend: true, videoSend: true };
        expect(object.media).to.deep.equal(msg);
        expect(object.success).to.be.a('function');
        expect(object.error).to.be.a('function');
      };

      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.publishOwnFeed();
    });

    it('should send an object when it gets pulisher SDP', function() {
      var jsep = 'jsSessionEstablishmentProtocol';
      var Janus;

      janusFactory.get = function() {
        Janus = function() {};
        Janus.debug = function() {};
        return Janus;
      };
      plugin.createOffer = function(object) {
        object.success(jsep);
      };
      plugin.send = sinon.spy();
      janusRTCAdapter.lazyJanusInstance();
      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.publishOwnFeed();

      expect(plugin.send).to.have.been.calledWith({ message: { request: 'configure', audio: true, video: true }, jsep: 'jsSessionEstablishmentProtocol'});
    });

    it('should throw error when it does not get publisher SDP ', function() {
      var Janus;

      janusFactory.get = function() {
        Janus = function() {};
        Janus.error = sinon.spy();
        return Janus;
      };
      plugin.createOffer = function(object) {
        object.error();
      };
      janusRTCAdapter.lazyJanusInstance();
      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.publishOwnFeed();

      expect(Janus.error).to.have.been.called;
    });
  });

});

