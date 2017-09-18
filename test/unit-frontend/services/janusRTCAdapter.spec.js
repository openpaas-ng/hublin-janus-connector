'use strict';

var expect = chai.expect;
var sinon = sinon;

describe('janusAdapter service', function() {
  var currentConferenceState, janusRTCAdapter, janusFactory, plugin, session, sfu, LOCAL_VIDEO_ID, REMOTE_VIDEO_IDS;

  beforeEach(function() {
    angular.mock.module('hublin.janus.connector', function($provide) {
      $provide.value('currentConferenceState', currentConferenceState);
      $provide.value('janusFactory', janusFactory);
      $provide.value('session', session);
      $provide.value('LOCAL_VIDEO_ID', LOCAL_VIDEO_ID);
      $provide.value('REMOTE_VIDEO_IDS', REMOTE_VIDEO_IDS);
    });
    LOCAL_VIDEO_ID = 'video-thumb0';
    REMOTE_VIDEO_IDS = ['video-thumb#1', 'video-thumb#2', 'video-thumb#3'];
    session = {
      getUsername: function() { return 'Woot';},
      getUserId: function() { return '0000'; }
    };
    plugin = {
      createOffer: function() {}
    };
    janusFactory = {
      get: function() {
        var Janus = function(object) {
          return object;
        };
        Janus.init = sinon.spy();
        Janus.debug = sinon.spy();
        Janus.attachMediaStream = sinon.spy();
        Janus.error = sinon.spy();

        return Janus;
      }
    };
    currentConferenceState = {};
    sfu = {
      attach: sinon.spy(),
      detach: sinon.spy()
    };

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

      expect(janusRTCAdapter.getSfu()).not.to.be.null;
      expect(janusRTCAdapter.getSfu().server).to.be.equal('http://localhost:8088/janus');
      expect(janusRTCAdapter.getSfu().success).to.be.a('function');
      expect(janusRTCAdapter.getSfu().error).to.deep.equal(janusRTCAdapter.handleError);
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
    it('should call Janus debug', function() {
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
      var Janus = janusRTCAdapter.lazyJanusInstance();
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
      currentConferenceState.removeAttendee = sinon.spy();
      janusRTCAdapter.lazyJanusInstance();
    });

    describe('should call handleJoined Message if msg.videoroom is joined', function() {
      it('should publish own feeds and attach remotefeeds', function() {
        var msg = { videoroom: 'joined', publishers: ['P1', 'P2'] };
        var jsSessionEstablishmentProtocol = null;
        plugin.createOffer = sinon.spy();

        janusRTCAdapter.setSfu(sfu);
        janusRTCAdapter.setPlugin(plugin);
        janusRTCAdapter.handleOnMessage(msg, jsSessionEstablishmentProtocol);

        expect(currentConferenceState.pushAttendee).to.be.calledOnce;
        expect(sfu.attach).to.be.calledTwice;
      });
    });

    it('should NOT call handleJoined Message if msg.videoroom is not joined', function() {
      var msg = null;
      var jsSessionEstablishmentProtocol  = null;

      janusRTCAdapter.setSfu(sfu);
      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.handleOnMessage(msg, jsSessionEstablishmentProtocol);

      expect(currentConferenceState.pushAttendee).not.to.be.called;
      expect(sfu.attach).not.to.be.called;
    });

    describe('should call handleEvent Message if msg.videoroom is event', function() {
      it('should call attach in newRemotefeed as many times as msg.publishers length', function() {
        var msg = { videoroom: 'event', publishers: ['P1', 'P2']};
        var jsSessionEstablishmentProtocol  = null;

        janusRTCAdapter.setSfu(sfu);
        janusRTCAdapter.setPlugin(plugin);
        janusRTCAdapter.handleOnMessage(msg, jsSessionEstablishmentProtocol);

        expect(sfu.attach).to.be.calledTwice;
      });

      it('should call unpublishFeed if event is unpublished', function() {
        var msg = { videoroom: 'event', unpublished: '0000' };
        var jsSessionEstablishmentProtocol  = null;
        sfu.rfid = '0000';
        sfu.rfindex = 0;
        var feeds = [sfu];

        janusRTCAdapter.setSfu(sfu);
        janusRTCAdapter.setFeeds(feeds);
        janusRTCAdapter.handleOnMessage(msg, jsSessionEstablishmentProtocol);

        expect(currentConferenceState.removeAttendee).to.be.calledWith(0);
        expect(sfu.detach).to.be.called;
      });
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
      var Janus = janusRTCAdapter.lazyJanusInstance();
      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.publishOwnFeed();

      expect(Janus.error).to.have.been.called;
    });
  });

  describe('video enabling and disabling', function() {
    it('should return true', function() {
      expect(janusRTCAdapter.isVideoEnabled()).to.be.true;
    });

    it('should return false', function() {
      janusRTCAdapter.setVideoEnabled(false);
      expect(janusRTCAdapter.isVideoEnabled()).to.be.false;
    });
  });

  describe('The leaveRoom method', function() {
    it('should send unpublish request', function() {
      plugin.send = sinon.spy();

      janusRTCAdapter.lazyJanusInstance();
      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.leaveRoom();

      expect(plugin.send).to.be.calledWith({ message: { request: 'unpublish'}});
    });
  });

  describe('The newRemoteFeeds method', function() {
    var id, display, Janus;
    beforeEach(function() {
      id = 0;
      display = 'Woot';
      Janus = {};
      janusFactory.get = function() {
        Janus.attachMediaStream = sinon.spy();
        Janus.debug = function() {};
        return Janus;
      };

      janusRTCAdapter.lazyJanusInstance();
    });
    it('should attach remote feeds', function() {
      sfu.attach = function(object) {
        expect(object.plugin).to.be.equal('janus.plugin.videoroom');
        expect(object.success).to.be.a('function');
        expect(object.error).to.be.a('function');
        expect(object.onremotestream).to.be.a('function');
        expect(object.onmessage).to.be.a('function');
      };

      janusRTCAdapter.setSfu(sfu);
      janusRTCAdapter.newRemoteFeed(id, display);
    });

    it('should call handleRemoteSuccessAttach when success callback is excuted', function() {
      var pluginHandle = {};

      pluginHandle.send = sinon.spy();
      sfu.attach = function(object) {
        object.success(pluginHandle);
      };
      janusRTCAdapter.setSfu(sfu);
      janusRTCAdapter.newRemoteFeed(id, display);

      expect(pluginHandle.send).to.have.been.calledWith({ message: { request: 'join', room: 1234, ptype: 'listener', feed: 0}});
    });

    it('should call handleOnRemoteStream when onremotestream callback is excuted', function() {
      var stream = 'remoteStream';
      var pluginHandle = {};

      pluginHandle.send = sinon.spy();
      sfu.attach = function(object) {
        object.onremotestream(stream);
      };
      currentConferenceState.getVideoElementById = function() {
        var element = {
          get: function(value) {
            return 'YoYo';
          }
        };
        return element;
      };
      janusRTCAdapter.setSfu(sfu);
      janusRTCAdapter.newRemoteFeed(id, display);

      expect(Janus.attachMediaStream).to.have.been.calledWith('YoYo', 'remoteStream');
    });

    it('should call handleRemoteOnMessage when on message callback is excuted', function() {
      var msg = { videoroom: 'attached', publishers: ['P1', 'P2'], id: 7777};
      var jsep = 'jsSessionEstablishmentProtocol';
      var pluginHandle = {};
      var feeds = ['P0', 'P1'];

      pluginHandle.send = function() {};
      pluginHandle.createAnswer = sinon.spy();
      currentConferenceState.pushAttendee = sinon.spy();
      sfu.attach = function(object) {
        object.success(pluginHandle);
        object.onmessage(msg, jsep);
      };

      janusRTCAdapter.setSfu(sfu);
      janusRTCAdapter.setFeeds(feeds);
      janusRTCAdapter.newRemoteFeed(id, display);

      expect(pluginHandle.createAnswer).to.be.called;
      expect(currentConferenceState.pushAttendee).to.be.calledWith(2, 7777, null, display);
    });
  });
});

