import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App_native';
import './index_native.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Native UI root element #root not found');
}

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
