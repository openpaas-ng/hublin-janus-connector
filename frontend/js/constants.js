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
      ack: 'ack',
      attached: 'attached',
      configure: 'configure',
      create: 'create',
      event: 'event',
      exists: 'exists',
      janusPort: 8088,
      janusHttpsPort: 8089,
      join: 'join',
      joined: 'joined',
      listener: 'listener',
      max_publishers: 10,
      message: 'message',
      publisher: 'publisher',
      textroom: 'janus.plugin.textroom',
      serverAddress: 'http://localhost:8088/janus',
      setup: 'setup',
      start: 'start',
      unpublish: 'unpublish',
      videoroom: 'janus.plugin.videoroom'
    });
})(angular);
