// Jest setup file for CVAT UI tests
import '@testing-library/jest-dom';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/tasks/1/jobs/1',
    pathname: '/tasks/1/jobs/1',
    search: '',
    origin: 'http://localhost:3000',
  },
  writable: true,
});

// Mock URL constructor for Node.js environment
const { URL } = require('url');
global.URL = URL;

// Mock URLSearchParams for Node.js environment  
global.URLSearchParams = URLSearchParams;