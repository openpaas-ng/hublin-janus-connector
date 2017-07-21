'use strict';

const express = require('express');
const FRONTEND_PATH = require('./constants').FRONTEND_PATH;

module.exports = ()=> {
  let app = express();
  app.use(express.static(FRONTEND_PATH));

  return app;
};
