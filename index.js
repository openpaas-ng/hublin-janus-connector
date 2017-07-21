'use strict';

const AwesomeModule = require('awesome-module');
const Dependency = AwesomeModule.AwesomeModuleDependency;

const myAwesomeModule = new AwesomeModule('hublin.janus.connector', {
  dependencies: [
    new Dependency(Dependency.TYPE_ABILITY, 'wsserver', 'wsserver'),
    new Dependency(Dependency.TYPE_NAME, 'webserver.wrapper', 'webserver-wrapper'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.io.meetings.core.logger', 'logger')
  ],
  //abilities: ['hublin.webrtc.connector'],
  states: {
    lib: (dependencies, callback)=> {
      const lib = {
        lib: null
      };

      return callback(null, lib);
    },

    deploy: (dependencies, callback)=> {
      const app = require('./backend/webserver/application')();
      let webserverWrapper = dependencies('webserver-wrapper');
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
