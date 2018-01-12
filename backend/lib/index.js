module.exports = dependencies => ({
  WebRTCAdapter: require('./JanusAdapter'),
  onAuthenticate: require('./auth')(dependencies)
});
