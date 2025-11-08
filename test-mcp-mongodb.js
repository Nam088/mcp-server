#!/usr/bin/env node

/**
 * Test script to verify MCP MongoDB server with correct authentication
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment variables
process.env.MONGODB_URI = 'mongodb://admin:admin@localhost:27017/?authSource=admin';
process.env.MONGODB_DATABASE = 'idlogiq';
process.env.MONGODB_MODE = 'READONLY';

// Path to the built server
const serverPath = join(__dirname, 'packages/mongodb/dist/bin/server.js');

console.log('Starting MCP MongoDB server with authentication...');
console.log('MONGODB_URI:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
console.log('MONGODB_DATABASE:', process.env.MONGODB_DATABASE);
console.log('Server path:', serverPath);
console.log('\nServer will start and wait for MCP protocol messages...');
console.log('Press Ctrl+C to stop\n');

// Spawn the server
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env,
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`\nServer exited with code ${code}`);
  process.exit(code || 0);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nStopping server...');
  server.kill();
  process.exit(0);
});

