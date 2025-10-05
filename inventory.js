/* js/inventory.js
   Inventory/navigation helpers for open access mode.
   - Ensures Add/Edit navigation won't trigger login redirects.
   - Provides helper functions window.appInventory.openAddProduct/openEditProduct
*/
(() => {
  'use strict';

  const SESSION_KEY = 'tia_session';

  function ensureSession() {
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        const devUser = { id: 'dev_' + Date.now(), username: 'dev-admin', role: 'admin', createdAt: new Date().toISOString() };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(devUser));
      }
    } catch (e) {
      console.warn('inventory.js: ensureSession failed', e);
    }
  }

  function openAddProduct() {
    ensureSession();
    window.location.href = 'add-product.html';
  }

  function openEditProduct(productId) {
    ensureSession();
    if (!productId) {
      window.location.href = 'products.html';
    } else {
      window.location.href = `edit-product.html?id=${encodeURIComponent(productId)}`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureSession();

    // Safe wiring if page has btnAddProduct or links using data-action attributes
    const addBtn = document.getElementById('btnAddProduct');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e && e.preventDefault && e.preventDefault();
        openAddProduct();
      });
    }

    // Optional: attach delegation for any element with data-open-add or data-open-edit
    document.body.addEventListener('click', (ev) => {
      const target = ev.target.closest && ev.target.closest('[data-open-add], [data-open-edit]');
      if (!target) return;
      ev.preventDefault();
      if (target.hasAttribute('data-open-add')) openAddProduct();
      if (target.hasAttribute('data-open-edit')) {
        const id = target.getAttribute('data-open-edit');
        openEditProduct(id);
      }
    });
  });

  window.appInventory = {
    openAddProduct,
    openEditProduct
  };
})();
