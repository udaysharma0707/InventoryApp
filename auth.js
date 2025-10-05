/* js/auth.js — No-Login Version
   Tile Inventory app
   Auth system disabled for open access
*/

(() => {
  const redirectPath = 'products.html'; // where to go after entering app

  // --- Basic no-login handler for index.html ---
  document.addEventListener('DOMContentLoaded', async () => {
    // if the "Enter App" button exists, go directly to main page
    const enterBtn = document.getElementById('enterApp');
    if (enterBtn) {
      enterBtn.addEventListener('click', () => {
        window.location.href = redirectPath;
      });
    }

    // Skip login auto-redirect logic — do NOT check for session
    // Do NOT force redirect back to index.html

    // Just in case older code runs:
    window.tiaAuth = {
      isAuthenticated: () => true,
      getSession: () => ({
        id: 'guest',
        username: 'Guest',
        role: 'viewer',
        createdAt: new Date().toISOString()
      }),
      logout: () => {
        // Instead of redirecting to login, just reload products page
        window.location.href = redirectPath;
      }
    };
  });
})();
