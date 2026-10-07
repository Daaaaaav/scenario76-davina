'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const requestLogger = require('./middleware/requestLogger');
const waf = require('./middleware/waf');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Middleware
app.use(requestLogger);
app.use(waf);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/', routes);

// Error handling (must be last)
app.use(errorHandler);

module.exports = app;
