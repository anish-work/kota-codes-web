import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { structuredData } from './seo';

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

export { structuredData };
export { SITE } from './content';
export { MARK_SIZE, MARK_SVG } from './weave';
