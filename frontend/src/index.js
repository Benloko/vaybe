import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const ensureRootElement = () => {
  const existing = document.getElementById('root');
  if (existing) return existing;

  const created = document.createElement('div');
  created.id = 'root';

  if (document.body) {
    document.body.appendChild(created);
  } else {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        document.body?.appendChild(created);
      },
      { once: true }
    );
  }

  return created;
};

const rootElement = ensureRootElement();
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
