import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LiffApp from './liff/LiffApp';

const isLiff = window.location.pathname.startsWith('/liff');
// Set a neutral default title immediately so LIFF users don't see the admin title
if (isLiff) document.title = '預約入場系統';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isLiff ? <LiffApp /> : <App />}
  </React.StrictMode>
);
