#!/usr/bin/env node
// src/index.tsx — entry point
import { render } from 'ink';
import App from './App.js';
process.stdout.write('\x1B[2J\x1B[3J\x1B[H');

render(<App />);
