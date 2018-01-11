const AwesomeModule = require('awesome-module');
const Dependency = AwesomeModule.AwesomeModuleDependency;
const MODULE_NAME = 'hublin.janus.connector';
const APP_NAME = 'connectorjanus';

const janusConnector = new AwesomeModule(MODULE_NAME, {
  dependencies: [
    new Dependency(Dependency.TYPE_ABILITY, 'wsserver', 'wsserver'),
    new Dependency(Dependency.TYPE_NAME, 'webserver.wrapper', 'webserver-wrapper'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.io.meetings.core.logger', 'logger')
  ],
  abilities: ['webrtc-adapter'],
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

      webserverWrapper.injectAngularModules(APP_NAME, ['app.js', 'services/janusRTCAdapter.js'], MODULE_NAME, ['live-conference']);
      webserverWrapper.injectJSAsset('connector', ['connectorjanus/js/janus.js'], ['connector']);
      webserverWrapper.addApp(APP_NAME, app);

      callback();
    }
  }
});

module.exports = janusConnector;
