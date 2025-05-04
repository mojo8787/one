/**
 * Script to copy required dependencies for Netlify functions
 */
const fs = require('fs');
const path = require('path');

const dependencies = [
  '@neondatabase/serverless',
  'express',
  'express-session',
  'passport',
  'passport-local',
  'serverless-http',
  'ws',
];

// Ensure directories exist
const functionsDir = path.join(process.cwd(), 'dist', 'functions');
const nodeModulesDir = path.join(functionsDir, 'node_modules');

if (!fs.existsSync(functionsDir)) {
  fs.mkdirSync(functionsDir, { recursive: true });
}

if (!fs.existsSync(nodeModulesDir)) {
  fs.mkdirSync(nodeModulesDir, { recursive: true });
}

// Utility function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source directory does not exist: ${src}`);
    return;
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy dependencies
for (const dep of dependencies) {
  const srcPath = path.join(process.cwd(), 'node_modules', dep);
  const destPath = path.join(nodeModulesDir, dep);
  
  if (fs.existsSync(srcPath)) {
    console.log(`Copying dependency: ${dep}`);
    copyDir(srcPath, destPath);
  } else {
    console.error(`Dependency not found: ${dep}`);
  }
}

console.log('Finished copying dependencies'); 