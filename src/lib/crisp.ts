/**
 * Crisp Live Chat integration
 *
 * Uses vanilla JS snippet (no npm package needed — avoids TS issues).
 * Configure VITE_CRISP_WEBSITE_ID in your environment.
 */

declare global {
  interface Window {
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
  }
}

const PUBLIC_ROUTES = ['/', '/clubs', '/login', '/club-login', '/club-signup', '/signup', '/privacy', '/terms', '/contact'];

let loaded = false;

export function initCrisp() {
  const websiteId = import.meta.env.VITE_CRISP_WEBSITE_ID;
  if (!websiteId || loaded) return;
  loaded = true;

  window.$crisp = window.$crisp || [];
  window.CRISP_WEBSITE_ID = websiteId;

  const s = document.createElement('script');
  s.src = 'https://client.crisp.chat/l.js';
  s.async = true;
  document.head.appendChild(s);
}

export function crispSetUser(email: string, data: Record<string, string>) {
  if (!window.$crisp) return;
  try {
    window.$crisp.push(['set', 'user:email', [email]]);
    window.$crisp.push(['set', 'session:data', [Object.entries(data)]]);
  } catch { /* crisp not loaded */ }
}

export function crispShowHideForRoute(pathname: string) {
  if (!window.$crisp) return;
  try {
    if (PUBLIC_ROUTES.includes(pathname)) {
      window.$crisp.push(['do', 'chat:hide']);
    } else {
      window.$crisp.push(['do', 'chat:show']);
    }
  } catch { /* crisp not loaded */ }
}

export function crispOpen() {
  if (!window.$crisp) return;
  try {
    window.$crisp.push(['do', 'chat:open']);
  } catch { /* crisp not loaded */ }
}
