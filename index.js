const AwesomeModule = require('awesome-module');
const Dependency = AwesomeModule.AwesomeModuleDependency;
const MODULE_NAME = 'hublin.janus.connector';
const APP_NAME = 'connectorjanus';

const janusConnector = new AwesomeModule(MODULE_NAME, {
  dependencies: [
    new Dependency(Dependency.TYPE_ABILITY, 'wsserver', 'wsserver'),
    new Dependency(Dependency.TYPE_NAME, 'webserver.wrapper', 'webserver-wrapper'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.io.meetings.core.logger', 'logger'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.webrtc', 'webrtc')
  ],
  abilities: ['webrtc-adapter'],
  states: {
    lib: (dependencies, callback) => {
      const webrtc = dependencies('webrtc');
      const lib = require('./backend/lib')(dependencies);

      webrtc.registry.register(MODULE_NAME, lib);
      callback(null, { lib });
    },

    deploy: (dependencies, callback) => {
      const app = require('./backend/webserver/application')();
      const webserverWrapper = dependencies('webserver-wrapper');
      const frontendModule = [
        'app.js',
        'constants.js',
        'run.js',
        'feed-registry.service.js',
        'feed.service.js',
        'janus-adapter.service.js',
        'janus-client.service.js',
        'janus-factory.service.js',
        'janus-configuration.service.js'
      ];

      webserverWrapper.injectAngularModules(APP_NAME, frontendModule, MODULE_NAME, ['live-conference']);
      webserverWrapper.injectJSAsset('connector', ['connectorjanus/js/thirdparty/janus.js'], ['connector']);
      webserverWrapper.addApp(APP_NAME, app);

      callback();
    }
  }
});

module.exports = janusConnector;
