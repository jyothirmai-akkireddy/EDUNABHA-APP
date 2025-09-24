// src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// NEW: Import the service worker registration file
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// NEW: Call the function to register the service worker
// This is what enables the offline capabilities!
serviceWorkerRegistration.register();