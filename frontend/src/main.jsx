import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LiffApp from './liff/LiffApp';

const isLiff = window.location.pathname.startsWith('/liff');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isLiff ? <LiffApp /> : <App />}
  </React.StrictMode>
);
