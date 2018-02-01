(function(angular) {
  'use strict';

  angular.module('hublin.janus.connector').factory('janusJoinLeaveNotificationService', janusJoinLeaveNotificationService);

  function janusJoinLeaveNotificationService($rootScope, session, notificationFactory) {
    return {
      registerListeners: registerListeners
    };

    function registerListeners() {
      $rootScope.$on('conferencestate:attendees:push', onJoin);
      $rootScope.$on('conferencestate:attendees:remove', onLeave);
    }

    function onJoin(event, attendee) {
      if (attendee.id !== session.user._id) {
        notificationFactory.weakInfo('Conference updated!', attendee.displayName + ' has joined the conference');
      }
    }

    function onLeave(event, attendee) {
      if (attendee.id !== session.user._id) {
        notificationFactory.weakInfo('Conference updated!', attendee.displayName + ' has left the conference');
      }
    }
  }
})(angular);
