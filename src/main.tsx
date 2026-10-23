import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App, pageFor } from './App';
import './styles.css';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App page={pageFor(location.pathname)} />
  </StrictMode>
);

// Production HTML is prerendered (see scripts/prerender.js), so hydrate it; in dev the root is empty.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
