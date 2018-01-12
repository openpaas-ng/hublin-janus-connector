const { EventEmitter } = require('events');

class JanusAdapter extends EventEmitter {
  constructor(options) {
    super();
    this.logger = options.dependencies('logger');
    this.events = this;
    this.log('Initialized');
  }

  connect(socket, WebRTCid, next) {
    this.log('Connect');
    next();
  }

  disconnect(connectionObj, next) {
    this.log('Disconnect');
    next();
  }

  createRoom(appObj, creatorConnectionObj, roomName, roomOptions, callback) {
    this.log(`Create room ${roomName}`);
    callback();
  }

  joinRoom(connectionObj, roomName, roomParameter, callback) {
    this.log(`Join room ${roomName}`);
    callback();
  }

  leaveRoom(connectionObj, roomName, next) {
    this.log(`Leave room ${roomName}`);
    next();
  }

  listen(webserver, wsserver, options, callback) {
    this.log('Adapter is now listening to events');
    callback();
  }

  log(message, args) {
    this.logger.info(`JanusAdapter: ${message}`, args);
  }
}

module.exports = JanusAdapter;
