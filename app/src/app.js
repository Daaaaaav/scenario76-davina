'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const requestLogger = require('./middleware/requestLogger');
const waf = require('./middleware/waf');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Disable default Express X-Powered-By header
app.disable('x-powered-by');

// Middleware — order matters: body parsers must come before WAF so req.body is populated
app.use(requestLogger);
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'SCENARIO75{Node.js}');
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(waf);

// Routes
app.use('/', routes);

// Error handling (must be last)
app.use(errorHandler);

module.exports = app;
