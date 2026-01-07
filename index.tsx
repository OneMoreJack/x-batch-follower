
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // 关键：引入 CSS 供 Vite 处理

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
