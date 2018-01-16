'use strict';

/* global chai */

var expect = chai.expect;

describe('janusConfigurationService service', function() {
  var config, janusConfigurationService;

  beforeEach(function() {

    angular.mock.module('hublin.janus.connector', function() {

    });

    angular.mock.inject(function(_janusConfigurationService_) {
      janusConfigurationService = _janusConfigurationService_;
    });
  });

  describe('getConferenceConfiguration method', function() {
    it('should return the janus configuration if exist', function() {
      var conference = {
        configuration: {
          hosts: {
            find: function() {
              return config;
            }
          }
        }
      };

      config = {
        type: 'janus',
        url: 'janusUrl'
      };

      var conferenceConfig = janusConfigurationService.getConferenceConfiguration(conference);

      expect(conferenceConfig).to.be.deep.equal(config);
    });

    it('should return the default janus configuration if don\'t exist', function() {
      var conference = {
        configuration: {
          hosts: {
            find: function() {
              return null;
            }
          }
        }
      };

      config = {
        type: 'janus',
        url: 'http://localhost:8088/janus'
      };

      var conferenceConfig = janusConfigurationService.getConferenceConfiguration(conference);

      expect(conferenceConfig).to.be.deep.equal(config);
    });
  });
});

