'use strict';

var AwesomeModule = require('awesome-module');
var Dependency = AwesomeModule.AwesomeModuleDependency;
var path = require('path');

var myAwesomeModule = new AwesomeModule('hublin.janus.connector', {
  dependencies: [
    new Dependency(Dependency.TYPE_ABILITY, 'wsserver', 'wsserver'),
    new Dependency(Dependency.TYPE_NAME, 'webserver.wrapper', 'webserver-wrapper'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.io.meetings.core.logger', 'logger')
  ],
  //abilities: ['hublin.webrtc.connector'],
  states: {
    lib: function(dependencies, callback) {
      var lib = {
        lib: null
      };

      return callback(null, lib);
    },

    deploy: function(dependencies, callback) {
      var app = require('./backend/webserver/application')();
      var webserverWrapper = dependencies('webserver-wrapper');
      webserverWrapper.injectAngularModules('connectorjanus', ['app.js', 'services/janusRTCAdapter.js'], 'hublin.janus.connector', ['live-conference']);
      webserverWrapper.addApp('connectorjanus', app);
      return callback();
    }
  }

});

/**
 * The main AwesomeModule describing the application.
 * @type {AwesomeModule}
 */
module.exports = myAwesomeModule;
