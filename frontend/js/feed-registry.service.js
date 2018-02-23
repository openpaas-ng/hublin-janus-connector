(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector').factory('janusFeedRegistry', janusFeedRegistry);

  function janusFeedRegistry(_, $log) {
    var remoteDataChannels = {};
    var feeds = {};
    var feedsMapping = {};
    var localFeed;

    return {
      add: add,
      addFeedMapping: addFeedMapping,
      get: get,
      getFeedMapping: getFeedMapping,
      getAll: getAll,
      getAllIds: getAllIds,
      getLocalFeed: getLocalFeed,
      setLocalFeed: setLocalFeed,
      remove: remove,
      getRemoteDataChannels: getRemoteDataChannels,
      addRemoteDataChannel: addRemoteDataChannel,
      removeRemoteDataChannel: removeRemoteDataChannel
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

    function getRemoteDataChannels() {
      return _.values(remoteDataChannels);
    }

    function addRemoteDataChannel(id) {
      remoteDataChannels[id] = { id: id, date: Date.now(), status: 'active' };
    }

    function removeRemoteDataChannel(id) {
      delete remoteDataChannels[id];
    }

    function getAll() {
      return _.values(feeds);
    }

    function getAllIds() {
      return _.keys(feeds);
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
