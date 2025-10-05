/* js/auth.js
   Authentication handlers for Tile Inventory app (Step 3)
   - Uses localStorage for demo user store
   - Hashes passwords using Web Crypto (SHA-256)
   - Stores session in sessionStorage; optional "Remember me" via localStorage
   - Creates a default admin account if none exists
   - Adjust redirectPath variable below to point to your dashboard page (e.g., "products.html")
*/

(() => {
  const USERS_KEY = 'tia_users';           // localStorage key for user list
  const SESSION_KEY = 'tia_session';       // sessionStorage key for current session
  const REMEMBER_KEY = 'tia_remember';     // localStorage key for "remember me" username
  const redirectPath = 'products.html';    // change to your dashboard page

  // ---------- Utility: convert ArrayBuffer to hex string ----------
  function bufToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ---------- Hash password using Web Crypto (SHA-256) ----------
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return bufToHex(hashBuffer);
  }

  // ---------- User store helpers ----------
  function loadUsers() {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed parsing users from storage:', e);
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function findUserByUsername(username) {
    const users = loadUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  async function createUser(username, plainPassword, role = 'admin') {
    if (!username || !plainPassword) throw new Error('username and password required');
    const hash = await hashPassword(plainPassword);
    const users = loadUsers();
    const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) throw new Error('User already exists');
    const user = {
      id: `u_${Date.now()}`,
      username,
      passwordHash: hash,
      role
    };
    users.push(user);
    saveUsers(users);
    return user;
  }

  // ---------- Default admin creation (for first run/demo) ----------
  async function ensureDefaultAdmin() {
    const users = loadUsers();
    if (users.length === 0) {
      // Default credentials (demo): change these before production
      const defaultUser = 'admin@example.com';
      const defaultPass = 'admin123';
      try {
        await createUser(defaultUser, defaultPass, 'admin');
        console.info('Default admin user created:', defaultUser);
      } catch (e) {
        console.error('Could not create default admin:', e);
      }
    }
  }

  // ---------- Session helpers ----------
  function setSession(user, remember = false) {
    const session = {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: new Date().toISOString()
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (remember) {
      // Only store username to rehydrate session; no password storage.
      localStorage.setItem(REMEMBER_KEY, user.username);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    // Do NOT remove REMEMBER_KEY here unless explicit logout should forget user
  }

  function getSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      // if remember exists, rehydrate minimal session
      const remembered = localStorage.getItem(REMEMBER_KEY);
      if (remembered) {
        const user = findUserByUsername(remembered);
        if (user) {
          setSession(user, true);
          return JSON.parse(sessionStorage.getItem(SESSION_KEY));
        }
      }
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function isAuthenticated() {
    return !!getSession();
  }

  // ---------- Authenticate user ----------
  async function authenticate(username, plainPassword) {
    const user = findUserByUsername(username);
    if (!user) return { success: false, message: 'User not found' };

    const hash = await hashPassword(plainPassword);
    if (hash !== user.passwordHash) return { success: false, message: 'Invalid credentials' };

    return { success: true, user };
  }

  // ---------- Login form handling ----------
  function attachLoginHandler() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      form.classList.add('was-validated');

      const usernameEl = document.getElementById('loginUser');
      const passwordEl = document.getElementById('loginPass');
      const rememberEl = document.getElementById('rememberMe');

      const username = usernameEl?.value?.trim();
      const password = passwordEl?.value ?? '';
      const remember = !!(rememberEl && rememberEl.checked);

      if (!username || !password) {
        // Browser validation already shows messages; keep UX simple.
        return;
      }

      try {
        const result = await authenticate(username, password);
        if (result.success) {
          setSession(result.user, remember);
          // Redirect to dashboard / products page
          // Use location.href so users can open developer tools to see navigation if needed.
          window.location.href = redirectPath;
        } else {
          showAuthError(result.message || 'Login failed');
        }
      } catch (err) {
        console.error('Login error:', err);
        showAuthError('An error occurred during login');
      }
    });
  }

  // ---------- UI helpers ----------
  function showAuthError(msg) {
    // Attempt to insert or update an error alert below the form
    const existing = document.getElementById('authError');
    if (existing) {
      existing.textContent = msg;
      existing.classList.remove('d-none');
      return;
    }
    const form = document.getElementById('loginForm');
    if (!form) return;
    const div = document.createElement('div');
    div.id = 'authError';
    div.className = 'alert alert-danger mt-3';
    div.setAttribute('role', 'alert');
    div.textContent = msg;
    form.appendChild(div);
  }

  // ---------- Logout helper (exposed) ----------
  function logout(forget = false) {
    clearSession();
    if (forget) localStorage.removeItem(REMEMBER_KEY);
    // redirect to login page
    window.location.href = 'index.html';
  }

  // Make some functions available on window for other pages (like settings.html)
  window.tiaAuth = {
    ensureDefaultAdmin,
    createUser,
    findUserByUsername,
    login: async (username, password, remember = false) => {
      const r = await authenticate(username, password);
      if (r.success) setSession(r.user, remember);
      return r;
    },
    logout,
    isAuthenticated,
    getSession
  };

  // ---------- Initialization ----------
  document.addEventListener('DOMContentLoaded', async () => {
    await ensureDefaultAdmin();
    attachLoginHandler();

    // If user is already authenticated, go to dashboard automatically
    if (isAuthenticated()) {
      // small delay to allow page HUD to show if needed
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 200);
    }
  });

})();
