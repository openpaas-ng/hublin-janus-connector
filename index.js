const AwesomeModule = require('awesome-module');
const Dependency = AwesomeModule.AwesomeModuleDependency;

const janusConnector = new AwesomeModule('hublin.janus.connector', {
  dependencies: [
    new Dependency(Dependency.TYPE_ABILITY, 'wsserver', 'wsserver'),
    new Dependency(Dependency.TYPE_NAME, 'webserver.wrapper', 'webserver-wrapper'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.io.meetings.core.logger', 'logger')
  ],
  //abilities: ['hublin.webrtc.connector'],
  states: {
    lib: (dependencies, callback) => {
      const lib = {
        lib: null
      };

      return callback(null, lib);
    },

    deploy: (dependencies, callback) => {
      const app = require('./backend/webserver/application')();
      const webserverWrapper = dependencies('webserver-wrapper');

      webserverWrapper.injectAngularModules('connectorjanus', ['app.js', 'services/janusRTCAdapter.js'], 'hublin.janus.connector', ['live-conference']);
      webserverWrapper.injectJSAsset('connector', ['connectorjanus/js/janus.js'], ['connector']);
      webserverWrapper.addApp('connectorjanus', app);

      callback();
    }
  }
});

module.exports = janusConnector;
