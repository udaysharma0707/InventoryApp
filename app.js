/* js/app.js
   Global app bootstrap for open / no-login mode.
   - Ensures a dev/guest session exists (non-destructive)
   - Exposes window.tiaAuth (safe, open-access)
   - Wires Enter / EnterApp buttons if present
   - THIS MUST BE INCLUDED BEFORE other app scripts in every HTML page
*/
(() => {
  'use strict';
  const SESSION_KEY = 'tia_session';
  const REMEMBER_KEY = 'tia_remember';
  const DEFAULT_REDIRECT = 'products.html';

  function createDevSessionIfMissing() {
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        const devUser = {
          id: 'dev_' + Date.now(),
          username: 'dev-admin',
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(devUser));
        try { localStorage.setItem(REMEMBER_KEY, devUser.username); } catch(e) {}
        console.info('app.js: dev session created:', devUser.username);
      } else {
        // keep existing session
      }
    } catch (e) {
      console.warn('app.js: could not create dev session', e);
    }
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) { /* ignore */ }
    // fallback guest
    return { id: 'guest', username: 'Guest', role: 'viewer', createdAt: new Date().toISOString() };
  }

  // Expose a tolerant tiaAuth for the whole app (no blocking)
  window.tiaAuth = {
    isAuthenticated: () => {
      try {
        return !!sessionStorage.getItem(SESSION_KEY);
      } catch(e) { return true; }
    },
    getSession: () => getSession(),
    login: async (username, password, remember = false) => {
      // For open mode: create a dev session (doesn't validate password)
      createDevSessionIfMissing();
      return { success: true, user: getSession() };
    },
    logout: (forget = false) => {
      try { sessionStorage.removeItem(SESSION_KEY); } catch(e) {}
      if (forget) try { localStorage.removeItem(REMEMBER_KEY); } catch(e) {}
      // Instead of forcing login, redirect to main page
      window.location.href = DEFAULT_REDIRECT;
    }
  };

  // When DOM ready, ensure a session and wire Enter buttons (if any)
  document.addEventListener('DOMContentLoaded', () => {
    createDevSessionIfMissing();

    // Wire possible button ids used across templates:
    const enterIds = ['enterBtn', 'enterApp', 'enter'];
    enterIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (ev) => {
          ev && ev.preventDefault && ev.preventDefault();
          createDevSessionIfMissing();
          window.location.href = DEFAULT_REDIRECT;
        });
      }
    });

    // Gentle guard: if a page navigates (script does window.location.href='index.html'),
    // and we detect that session exists, auto-redirect to products — prevents bouncing.
    // Note: this *does not* and cannot intercept direct assignment to location, but it
    // will re-route users quickly if they land on index.html with a session.
    try {
      if (window.location.pathname.endsWith('/index.html') || window.location.pathname === '/' ) {
        // if session exists, move to main page
        if (window.tiaAuth && window.tiaAuth.isAuthenticated && window.tiaAuth.isAuthenticated()) {
          // small delay so developer can still see index if wanted
          setTimeout(() => {
            if (window.location.pathname.endsWith('/index.html') || window.location.pathname === '/') {
              window.location.href = DEFAULT_REDIRECT;
            }
          }, 300);
        }
      }
    } catch (e) { /* ignore */ }

    console.info('app.js initialized — open-access mode active');
  });
})();
