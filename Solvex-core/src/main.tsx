import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App_native';
import './index_native.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
