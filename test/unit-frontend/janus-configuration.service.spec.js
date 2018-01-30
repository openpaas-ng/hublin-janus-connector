'use strict';

/* global chai, sinon: true */

var expect = chai.expect;

describe('janusConfigurationService service', function() {
  var janusConfigurationService, $window;

  beforeEach(function() {
    $window = {
      location: {
        protocol: 'http:',
        hostname: 'localhost'
      }
    };

    angular.mock.module('hublin.janus.connector', function($provide) {
      $provide.value('$window', $window);
    });

    angular.mock.inject(function(_janusConfigurationService_) {
      janusConfigurationService = _janusConfigurationService_;
    });
  });

  describe('getConferenceConfiguration method', function() {
    it('should return the janus configuration if defined', function() {
      var config = {
        type: 'janus',
        url: 'janusUrl'
      };
      var conference = {
        configuration: {
          hosts: {
            find: sinon.stub().returns(config)
          }
        }
      };

      var conferenceConfig = janusConfigurationService.getConferenceConfiguration(conference);

      expect(conference.configuration.hosts.find).to.have.been.calledOnce;
      expect(conferenceConfig).to.be.deep.equal(config);
    });

    describe('When janus configuration is not defined', function() {
      it('should return the default janus configuration if don\'t exist', function() {
        var config = {
          type: 'janus',
          url: 'http://localhost:8088/janus'
        };
        var conference = {
          configuration: {
            hosts: {
              find: sinon.stub().returns(null)
            }
          }
        };

        var conferenceConfig = janusConfigurationService.getConferenceConfiguration(conference);

        expect(conference.configuration.hosts.find).to.have.been.calledOnce;
        expect(conferenceConfig).to.be.deep.equal(config);
      });

      it('should return the default HTTPs janus configuration when over https', function() {
        $window.location.protocol = 'https:';

        var config = {
          type: 'janus',
          url: 'https://localhost:8089/janus'
        };
        var conference = {
          configuration: {
            hosts: {
              find: sinon.stub().returns(null)
            }
          }
        };

        var conferenceConfig = janusConfigurationService.getConferenceConfiguration(conference);

        expect(conference.configuration.hosts.find).to.have.been.calledOnce;
        expect(conferenceConfig).to.be.deep.equal(config);
      });
    });
  });
});

