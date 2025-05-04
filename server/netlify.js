const express = require('express');
const serverless = require('serverless-http');
const { registerSimpleRoutes } = require('./routes-simple');

// Create Express app
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up simplified routes
async function initialize() {
  try {
    await registerSimpleRoutes(app);
    console.log('Express app initialized for Netlify functions');
  } catch (error) {
    console.error('Error initializing Express app:', error);
  }
}

// Run initialization
initialize();

// Export the handler
module.exports.handler = serverless(app); 