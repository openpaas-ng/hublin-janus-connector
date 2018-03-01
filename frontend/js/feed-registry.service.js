(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector').factory('janusFeedRegistry', janusFeedRegistry);

  function janusFeedRegistry(_, $log) {
    var feeds = {};
    var feedsMapping = {};
    var localFeed;

    return {
      add: add,
      addFeedMapping: addFeedMapping,
      get: get,
      getFeedMapping: getFeedMapping,
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

    function addFeedMapping(localFeedId, remoteFeedId) {
      $log.info('Mapping feed  localFeed ', localFeedId, ' with remoteFeed', remoteFeedId);
      feedsMapping[remoteFeedId] = localFeedId;
    }

    function getFeedMapping(id) {
      return feedsMapping[id];
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
