/* ============================================
   COMPANYWISE — credit-badge.js
   Small pill widget showing remaining credits
   Self-initializing with public API

   Depends on: credit-wallet.js (window.CompanyWiseWallet)
               purchase-dialog.js (window.CompanyWisePurchase)
   ============================================ */

(function () {
  'use strict';

  const CreditBadge = {
    instances: [],

    create(container) {
      if (!container) return;

      const badge = document.createElement('div');
      badge.className = 'cb-badge';
      container.appendChild(badge);

      const instance = { container, badge };
      this.instances.push(instance);

      badge.addEventListener('click', () => {
        if (window.CompanyWisePurchase) {
          window.CompanyWisePurchase.open();
        }
      });

      this.update(instance);
      return instance;
    },

    update(instance) {
      const badge = instance.badge;
      const Wallet = window.CompanyWiseWallet;
      const balance = Wallet ? Wallet.getBalance() : 0;

      badge.style.display = 'inline-flex';
      badge.innerHTML = `
        <i class="ph-fill ph-star cb-badge-icon"></i>
        <span class="cb-badge-count">${balance} credit${balance !== 1 ? 's' : ''}</span>
      `;

      badge.classList.toggle('cb-badge--empty', balance === 0);
    },

    updateAll() {
      this.instances.forEach(instance => this.update(instance));
    },

    destroy(instance) {
      const idx = this.instances.indexOf(instance);
      if (idx !== -1) {
        this.instances.splice(idx, 1);
      }
      if (instance.badge && instance.badge.parentNode) {
        instance.badge.parentNode.removeChild(instance.badge);
      }
    },

    init() {
      document.addEventListener('creditWalletChanged', () => {
        this.updateAll();
      });
    }
  };

  CreditBadge.init();

  window.CompanyWiseCreditBadge = {
    create: (container) => CreditBadge.create(container),
    updateAll: () => CreditBadge.updateAll(),
    destroy: (instance) => CreditBadge.destroy(instance)
  };

})();
