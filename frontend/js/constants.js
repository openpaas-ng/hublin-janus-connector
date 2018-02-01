(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector')
    .constant('JANUS_FEED_TYPE', {
      remote: 'remote',
      local: 'local'
    })
    .constant('JANUS_BITRATES', {
      low: 64000,
      medium: 128000,
      nolimit: 0
    })
    .constant('JANUS_MODULE_NAME', 'hublin.janus.connector')
    .constant('JANUS_CONSTANTS', {
      janusPort: 8088,
      janusHttpsPort: 8089,
      create: 'create',
      join: 'join',
      exists: 'exists',
      publisher: 'publisher',
      listener: 'listener',
      serverAddress: 'http://localhost:8088/janus',
      videoroom: 'janus.plugin.videoroom',
      configure: 'configure',
      joined: 'joined',
      attached: 'attached',
      event: 'event',
      unpublish: 'unpublish',
      start: 'start'
    });
})(angular);
