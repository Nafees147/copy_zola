import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// In sandboxed environments like AI Studio, the app is served from a 'blob:' URL.
// BrowserRouter has issues with this, as it tries to manipulate history with absolute
// paths that don't match the blob's origin, causing security errors.
// HashRouter uses the URL fragment (#), which avoids these cross-origin issues.
// When in a blob environment, we fall back to a client-side render (CSR) with HashRouter
// to avoid the inevitable hydration mismatch with the server-rendered content.
const isBlobProtocol = window.location.protocol === 'blob:';
const Router = isBlobProtocol ? HashRouter : BrowserRouter;

const app = (
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);

if (isBlobProtocol) {
  // In blob environments, SSR hydration is expected to fail due to router mismatch.
  // We opt for a client-side render instead to ensure the app runs correctly.
  const root = createRoot(rootElement);
  root.render(app);
} else {
  // In standard http/https environments, proceed with hydration.
  hydrateRoot(
    rootElement,
    app
  );
}
