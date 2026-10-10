import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { DEMO } from './api.js';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import './styles.css';

// The demo lives on GitHub Pages, which cannot rewrite page addresses, so it uses #-style links.
const Router = DEMO ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
