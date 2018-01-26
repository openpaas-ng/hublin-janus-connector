(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector').factory('janusFeedRegistry', janusFeedRegistry);

  function janusFeedRegistry(_, $log) {
    var feeds = {};
    var localFeed;

    return {
      add: add,
      get: get,
      getAll: getAll,
      getLocalFeed: getLocalFeed,
      setLocalFeed: setLocalFeed,
      remove: remove
    };

    function add(feed) {
      $log.info('Adding feed to registry', feed);
      feeds[feed.id] = feed;
    }

    function get(id) {
      return feeds[id];
    }

    function getAll() {
      return _.values(feeds);
    }

    function getLocalFeed() {
      return localFeed;
    }

    function setLocalFeed(feed) {
      localFeed = feed;
    }

    function remove(id) {
      delete feeds[id];
    }

  }
})(angular);
