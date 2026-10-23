import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App, type Page } from './App';
import { structuredData } from './seo';

export function render(page: Page) {
  return renderToString(
    <StrictMode>
      <App page={page} />
    </StrictMode>,
  );
}

export { structuredData };
export { REGISTER_PAGE, SITE } from './content';
export { MARK_SIZE, MARK_SVG } from './weave';
