'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('janusAdapter service', function() {
  var currentConferenceState, attachSpy, janusOptions, janusInitMock, janusAttachMediaStreamMock,
    JanusListDevicesMock, janusRTCAdapter, janusFactory, Janus, plugin,
    session, sfu, LOCAL_VIDEO_ID, REMOTE_VIDEO_IDS, config, $log;

  LOCAL_VIDEO_ID = 'video-thumb0';
  REMOTE_VIDEO_IDS = ['video-thumb#1', 'video-thumb#2', 'video-thumb#3'];

  currentConferenceState = {
    conference: {
      configuration: {
        hosts: {
          find: function() {
            return config;
          }
        }
      }
    }
  };

  Janus = function(options) {
    janusOptions = options;
  };

  attachSpy = sinon.spy();
  Janus.prototype.attach = attachSpy;

  session = {
    getUsername: function() { return 'Woot'; },
    getUserId: function() { return '0000'; },
    conference: {
      roomId: 12345
    }
  };

  plugin = {
    createOffer: function() { }
  };

  beforeEach(function() {
    janusInitMock = sinon.spy();
    janusAttachMediaStreamMock = sinon.spy();
    JanusListDevicesMock = sinon.spy();

    janusFactory = {};

    Janus.init = janusInitMock;
    Janus.attachMediaStream = janusAttachMediaStreamMock;
    Janus.listDevices = JanusListDevicesMock;
    janusFactory.get = sinon.stub().returns(Janus);

    sfu = {
      attach: sinon.spy(),
      detach: sinon.spy()
    };

    angular.mock.module('hublin.janus.connector', function($provide) {
      $provide.value('currentConferenceState', currentConferenceState);
      $provide.value('janusFactory', janusFactory);
      $provide.value('session', session);
      $provide.value('LOCAL_VIDEO_ID', LOCAL_VIDEO_ID);
      $provide.value('REMOTE_VIDEO_IDS', REMOTE_VIDEO_IDS);
    });

    angular.mock.inject(function(_janusRTCAdapter_, _$log_) {
      janusRTCAdapter = _janusRTCAdapter_;
      $log = _$log_;
    });

  });

  describe('The connect method', function() {
    it('should instanciate a new janus client instance', function() {
      var servers = ['foo', 'bar'];

      currentConferenceState.conference.iceServers = servers;
      config = {
        type: 'janus',
        url: 'http://localhost:8088/janus'
      };

      janusRTCAdapter.connect();

      expect(janusInitMock).to.have.been.called;
      expect(janusOptions.server).to.equal(config.url);
      expect(janusOptions.iceServers).to.equal(servers);
      expect(janusOptions.success).to.be.a('function');
      expect(janusOptions.error).to.be.a('function');
    });

    it('should call janus.attach if Janus session has been successfully created', function() {
      config = {
        type: 'janus',
        url: 'http://localhost:8088/janus'
      };

      janusRTCAdapter.connect();
      janusOptions.success();

      expect(attachSpy).to.have.been.calledWith({
        plugin: 'janus.plugin.videoroom',
        success: sinon.match.func,
        error: sinon.match.func,
        onmessage: sinon.match.func,
        onlocalstream: sinon.match.func
      });
    });

    it('should use the default config if the conference do not have janus config', function() {
      config = null;

      expect(janusOptions.server).to.equal('http://localhost:8088/janus');
    });
  });

  describe('handleSuccessAttach method', function() {
    var pluginHandle = {};
    var createRequestSpy, existsRequestSpy, joinRequestSpy;
    var response = {
      exists: false
    };

    beforeEach(function() {
      createRequestSpy = sinon.spy();
      existsRequestSpy = sinon.spy();
      joinRequestSpy = sinon.spy();

      pluginHandle.send = function(request) {
        switch (request.message.request) {
          case 'create': createRequestSpy(request);
            break;
          case 'exists': existsRequestSpy(request);
            break;
          case 'join': joinRequestSpy(request);
            break;
        }
        if (request.success) {
          response.room = request && request.message && request.message.room;
          request.success(response);
        }
      };
    });

    it('should check if room exists', function() {
      response.exists = true;

      janusRTCAdapter.handleSuccessAttach(pluginHandle);

      expect(janusRTCAdapter.getPlugin()).to.be.equal(pluginHandle);
      expect(existsRequestSpy).to.have.been.calledWith(sinon.match({ message: { request: 'exists', room: 12345 }}));
      expect(createRequestSpy).to.not.have.been.called;
      expect(joinRequestSpy).to.have.been.calledWith(sinon.match({ message: { request: 'join', room: 12345, ptype: 'publisher', display: 'Woot' } }));
    });

    it('should send message', function() {
      response.exists = false;

      janusRTCAdapter.handleSuccessAttach(pluginHandle);

      expect(janusRTCAdapter.getPlugin()).to.be.equal(pluginHandle);
      expect(existsRequestSpy).to.have.been.calledWith(sinon.match({ message: { request: 'exists', room: 12345 }}));
      expect(createRequestSpy).to.have.been.calledWith(sinon.match({ message: { request: 'create', room: 12345 }}));
      expect(joinRequestSpy).to.have.been.calledWith(sinon.match({ message: { request: 'join', room: 12345, ptype: 'publisher', display: 'Woot' } }));
    });

  });

  describe('The handle error method', function() {
    it('should log error', function() {
      var logSpy = sinon.spy($log, 'debug');

      janusRTCAdapter.handleError('error');

      expect(logSpy).to.have.been.calledWith(sinon.match(/Error/));
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
      var spy;

      janusFactory.get = function() {
        Janus.attachMediaStream = sinon.spy();

        return Janus;
      };

      currentConferenceState.getVideoElementById = function() {
        var element = {
          get: function() {
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
      currentConferenceState.pushAttendee = sinon.spy();
      currentConferenceState.removeAttendee = sinon.spy();
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
      var jsSessionEstablishmentProtocol = null;

      janusRTCAdapter.setSfu(sfu);
      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.handleOnMessage(msg, jsSessionEstablishmentProtocol);

      expect(currentConferenceState.pushAttendee).not.to.be.called;
      expect(sfu.attach).not.to.be.called;
    });

    describe('should call handleEvent Message if msg.videoroom is event', function() {
      it('should call attach in newRemotefeed as many times as msg.publishers length', function() {
        var msg = { videoroom: 'event', publishers: ['P1', 'P2'] };
        var jsSessionEstablishmentProtocol = null;

        janusRTCAdapter.setSfu(sfu);
        janusRTCAdapter.setPlugin(plugin);
        janusRTCAdapter.handleOnMessage(msg, jsSessionEstablishmentProtocol);

        expect(sfu.attach).to.be.calledTwice;
      });

      it('should call unpublishFeed if event is unpublished', function() {
        var msg = { videoroom: 'event', unpublished: '0000' };
        var jsSessionEstablishmentProtocol = null;

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
      var jsSessionEstablishmentProtocol = {};

      plugin.handleRemoteJsep = sinon.spy();
      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.handleOnMessage(msg, jsSessionEstablishmentProtocol);

      expect(plugin.handleRemoteJsep).to.have.been.calledWith({ jsep: jsSessionEstablishmentProtocol });
    });

    it('should  Not call handleRemoteJsep when jsSessionEstablishmentProtocol is undefined or null', function() {
      var msg = null;
      var jsSessionEstablishmentProtocol = null;

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

      plugin.createOffer = function(object) {
        object.success(jsep);
      };
      plugin.send = sinon.spy();
      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.publishOwnFeed();

      expect(plugin.send).to.have.been.calledWith({ message: { request: 'configure', audio: true, video: true }, jsep: 'jsSessionEstablishmentProtocol' });
    });

    it('should throw error when it does not get publisher SDP ', function() {
      var logErrorSpy = sinon.spy($log, 'error');

      plugin.createOffer = function(object) {
        object.error();
      };

      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.publishOwnFeed();

      expect(logErrorSpy).to.have.been.calledWith(sinon.match(/WebRTC error/));
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

      janusRTCAdapter.setPlugin(plugin);
      janusRTCAdapter.leaveRoom();

      expect(plugin.send).to.be.calledWith({ message: { request: 'unpublish' } });
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
        Janus.debug = function() { };

        return Janus;
      };
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

      expect(pluginHandle.send).to.have.been.calledWith({ message: { request: 'join', room: 12345, ptype: 'listener', feed: 0 } });
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
          get: function() {
            return 'YoYo';
          }
        };

        return element;
      };
      janusRTCAdapter.setSfu(sfu);
      janusRTCAdapter.newRemoteFeed(id, display);

      expect(janusAttachMediaStreamMock).to.have.been.calledWith('YoYo', 'remoteStream');
    });

    it('should call handleRemoteOnMessage when on message callback is excuted', function() {
      var msg = { videoroom: 'attached', publishers: ['P1', 'P2'], id: 7777 };
      var jsep = 'jsSessionEstablishmentProtocol';
      var pluginHandle = {};
      var feeds = ['P0', 'P1'];

      pluginHandle.send = function() { };
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

