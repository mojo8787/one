import express from 'express';
import serverless from 'serverless-http';
import { installExpressApp } from './index';

// Create Express app
const app = express();

// Create Netlify serverless function handler
export const handler = serverless(app);

// Initialize the app when the module is loaded
(async () => {
  try {
    await installExpressApp(app);
    console.log('Express app initialized for Netlify functions');
  } catch (error) {
    console.error('Error initializing Express app:', error);
  }
})(); 