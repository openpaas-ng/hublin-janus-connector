'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The janusAdapter service', function() {
  var currentConferenceState, error, $rootScope, localFeed, attachSpy, janusFeedRegistry, janusOptions, janusInitMock, janusAttachMediaStreamMock,
    JanusListDevicesMock, janusRTCAdapter, janusFactory, Janus, $q,
    session, sfu, LOCAL_VIDEO_ID, REMOTE_VIDEO_IDS, config;

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

  beforeEach(function() {
    error = new Error('💣');
    localFeed = {
      id: 'localfeedid'
    };
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

    angular.mock.inject(function(_$q_, _$rootScope_, _janusRTCAdapter_, _janusFeedRegistry_) {
      $rootScope = _$rootScope_;
      janusRTCAdapter = _janusRTCAdapter_;
      janusFeedRegistry = _janusFeedRegistry_;
      $q = _$q_;
    });

  });

  describe('The myRtcid function', function() {
    it('should return undefined when plugin is not defined', function() {
      expect(janusRTCAdapter.myRtcid()).to.be.undefined;
    });

    it('should return the right id', function() {
      janusFeedRegistry.setLocalFeed(localFeed);

      expect(janusRTCAdapter.myRtcid()).to.equal(localFeed.id);
    });
  });

  describe('The connect function', function() {
    it('should instanciate a new janus client instance', function() {
      var servers = ['foo', 'bar'];

      currentConferenceState.conference.iceServers = servers;
      config = {
        type: 'janus',
        url: 'http://localhost:8088/janus'
      };

      janusRTCAdapter.connect();
      $rootScope.$digest();

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

      janusRTCAdapter.connect(null, function() {});
      janusOptions.success();
      $rootScope.$digest();

      expect(attachSpy).to.have.been.calledWith({
        plugin: 'janus.plugin.videoroom',
        success: sinon.match.func,
        error: sinon.match.func,
        onmessage: sinon.match.func,
        onlocalstream: sinon.match.func,
        webrtcState: sinon.match.func
      });
    });

    it('should call the callback with error connect to janus fails', function() {
      var spy = sinon.spy();

      config = {
        type: 'janus',
        url: 'http://localhost:8088/janus'
      };

      janusRTCAdapter.connect(null, spy);
      janusOptions.error(error);
      $rootScope.$digest();

      expect(attachSpy).to.have.been.calledWith({
        plugin: 'janus.plugin.videoroom',
        success: sinon.match.func,
        error: sinon.match.func,
        onmessage: sinon.match.func,
        onlocalstream: sinon.match.func,
        webrtcState: sinon.match.func
      });
      expect(spy).to.have.been.calledWith(error);
    });

    it('should use the default config if the conference do not have janus config', function() {
      config = null;

      expect(janusOptions.server).to.equal('http://localhost:8088/janus');
    });
  });

  describe('The enableMicrophone function', function() {
    var localFeed = {};

    beforeEach(function() {
      localFeed.toggleMicrophone = sinon.spy();

      janusFeedRegistry.setLocalFeed(localFeed);
    });

    it('should call localFeed toggleMicrophone when disabling microphone', function() {
      janusRTCAdapter.enableMicrophone(false);

      expect(localFeed.toggleMicrophone).to.have.been.calledWith(false);
    });

    it('should call localFeed toggleMicrophone when enabling microphone', function() {
      janusRTCAdapter.enableMicrophone(true);

      expect(localFeed.toggleMicrophone).to.have.been.calledWith(true);
    });
  });

  describe('The toggleVideo function', function() {
    var localFeed = {};

    beforeEach(function() {
      localFeed.toggleVideo = sinon.spy();

      janusFeedRegistry.setLocalFeed(localFeed);
    });

    it('should call localFeed enableMicrophone when disabling microphone', function() {
      janusRTCAdapter.enableVideo(false);

      expect(localFeed.toggleVideo).to.have.been.calledWith(false);
    });

    it('should call localFeed enableMicrophone when enabling microphone', function() {
      janusRTCAdapter.enableVideo(true);

      expect(localFeed.toggleVideo).to.have.been.calledWith(true);
    });
  });

  describe('The joinConference function', function() {
    describe('The onSuccess callback', function() {
      var pluginHandle = {};
      var createRequestSpy, existsRequestSpy, joinRequestSpy;
      var response = {
        exists: false
      };

      beforeEach(function() {
        createRequestSpy = sinon.stub().returns($q.when());
        existsRequestSpy = sinon.stub().returns($q.when());
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
        var spy = sinon.spy();

        response.exists = true;
        janusRTCAdapter.connect(null, spy);
        janusOptions.success();
        $rootScope.$digest();
        attachSpy.firstCall.args[0].success(pluginHandle);
        $rootScope.$digest();

        expect(existsRequestSpy).to.have.been.calledWith(sinon.match({ message: { request: 'exists', room: 12345 }}));
        expect(createRequestSpy).to.not.have.been.called;
        expect(spy).to.have.been.calledOnce;
      });
    });

    describe.skip('The onmessage callback', function() {
      var pluginHandle;

      beforeEach(function() {
        pluginHandle = {
          send: sinon.spy(),
          createOffer: sinon.spy()
        };
        currentConferenceState.pushAttendee = sinon.spy();
        currentConferenceState.removeAttendee = sinon.spy();
      });

      describe('when msg.videoroom === event', function() {
        it('should call attach in subscribeToRemoteFeed as many times as msg.publishers length', function() {
          var msg = { videoroom: 'event', publishers: ['P1', 'P2'] };
          var jsSessionEstablishmentProtocol = null;

          janusRTCAdapter.connect();
          janusOptions.success();
          $rootScope.$digest();

          attachSpy.firstCall.args[0].success(pluginHandle);
          attachSpy.firstCall.args[0].onmessage(msg, jsSessionEstablishmentProtocol);

          expect(sfu.attach).to.be.calledTwice;
        });

        it('should call unpublishFeed if event is unpublished', function() {
          var id = '0000';
          var msg = { videoroom: 'event', unpublished: id };
          var feed = { id: id, rfindex: 0, destroy: sinon.spy()};

          janusFeedRegistry.add(feed);
          janusRTCAdapter.setSfu(sfu);
          janusRTCAdapter.handleOnMessage(msg);

          expect(currentConferenceState.removeAttendee).to.have.been.calledWith(0);
          expect(feed.destroy).to.have.been.called;
        });
      });

      describe('when msg.videoroom === joined', function() {
        it('should handle local feed resources', function() {
          var msg = { id: 'LoL', videoroom: 'joined'};

          currentConferenceState.pushAttendee = sinon.spy();
          janusRTCAdapter.connect();
          janusOptions.success();
          $rootScope.$digest();

          attachSpy.firstCall.args[0].success(pluginHandle);
          attachSpy.firstCall.args[0].onmessage(msg);

          expect(pluginHandle.createOffer).to.have.been.called;
          expect(currentConferenceState.pushAttendee).to.have.been.calledWith(0, 'LoL', '0000', 'Woot');
        });
      });

      it('should publish own feeds and attach remotefeeds', function() {
        var msg = { videoroom: 'joined', publishers: ['P1', 'P2'] };
        var jsSessionEstablishmentProtocol = null;

        pluginHandle.createOffer = sinon.spy();

        janusRTCAdapter.connect();
        janusOptions.success();
        $rootScope.$digest();

        attachSpy.firstCall.args[0].success(pluginHandle);
        attachSpy.firstCall.args[0].onmessage(msg, jsSessionEstablishmentProtocol);

        expect(currentConferenceState.pushAttendee).to.have.been.calledOnce;
        expect(attachSpy).to.have.been.calledWith(sinon.match({onremotestream: sinon.match.func}));
      });

      it('should NOT call handleJoined Message if msg.videoroom is not joined', function() {
        var msg = null;
        var jsSessionEstablishmentProtocol = null;

        janusRTCAdapter.connect();
        janusOptions.success();
        $rootScope.$digest();

        attachSpy.firstCall.args[0].success(pluginHandle);
        attachSpy.firstCall.args[0].onmessage(msg, jsSessionEstablishmentProtocol);

        expect(currentConferenceState.pushAttendee).not.to.be.called;
      });

      it('should call handleRemoteJsep when jsSessionEstablishmentProtocol is defined and not null', function() {
        var msg = null;
        var jsSessionEstablishmentProtocol = {};

        pluginHandle.handleRemoteJsep = sinon.spy();
        janusRTCAdapter.connect();
        janusOptions.success();
        $rootScope.$digest();

        attachSpy.firstCall.args[0].success(pluginHandle);
        attachSpy.firstCall.args[0].onmessage(msg, jsSessionEstablishmentProtocol);

        expect(pluginHandle.handleRemoteJsep).to.have.been.calledWith({ jsep: jsSessionEstablishmentProtocol });
      });

      it('should  Not call handleRemoteJsep when jsSessionEstablishmentProtocol is undefined or null', function() {
        var msg = null;
        var jsSessionEstablishmentProtocol = null;

        pluginHandle.handleRemoteJsep = sinon.spy();
        janusRTCAdapter.connect();
        janusOptions.success();
        $rootScope.$digest();

        attachSpy.firstCall.args[0].success(pluginHandle);
        attachSpy.firstCall.args[0].onmessage(msg, jsSessionEstablishmentProtocol);

        expect(pluginHandle.handleRemoteJsep).not.to.be.called;
      });
    });

    describe('The onlocalstream callback', function() {
      var pluginHandle;

      beforeEach(function() {
        pluginHandle = {
          send: sinon.spy(),
          createOffer: sinon.spy()
        };
      });

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
              return { muted: false };
            }
          };

          return element;
        };

        spy = sinon.spy(currentConferenceState, 'getVideoElementById');
        janusRTCAdapter.connect(null, function() {});
        janusOptions.success();
        $rootScope.$digest();

        attachSpy.firstCall.args[0].success(pluginHandle);
        attachSpy.firstCall.args[0].onlocalstream(stream);

        expect(spy).to.have.been.calledWith(LOCAL_VIDEO_ID);
        expect(Janus.attachMediaStream).to.have.been.calledWith({ muted: true }, 'stream');
      });
    });
  });
});
