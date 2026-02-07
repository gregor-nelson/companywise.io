/* ============================================
   COMPANYWISE — upgrade-prompt.js
   Upgrade/unlock prompts for premium gating
   Two modes: inline overlay + mini-dialog card

   Depends on: purchase-dialog.js (window.CompanyWisePurchase)
               credit-wallet.js (window.CompanyWiseWallet)
   ============================================ */

(function () {
  'use strict';

  // ---- Utility ----
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  const UpgradePrompt = {
    miniDialogEl: null,

    // ---- Mini-Dialog Mode ----
    // Card that appears below hero verdict card
    showMiniDialog(company) {
      this.hideMiniDialog();

      var el = document.createElement('div');
      el.className = 'up-mini-dialog';
      el.id = 'up-mini-dialog';

      var companyName = company && company.name ? company.name : 'this company';

      el.innerHTML = `
        <div class="up-mini-card">
          <div class="up-mini-header">
            <div class="up-mini-icon">
              <i class="ph ph-star"></i>
            </div>
            <div>
              <h4 class="up-mini-title">Unlock Premium Report</h4>
              <p class="up-mini-desc">Get the full analysis for ${escapeHtml(companyName)}</p>
            </div>
          </div>
          <div class="up-mini-features">
            <div class="up-mini-feature">
              <i class="ph ph-chart-line-up"></i>
              <span>Financial deep dive</span>
            </div>
            <div class="up-mini-feature">
              <i class="ph ph-users"></i>
              <span>Director history</span>
            </div>
            <div class="up-mini-feature">
              <i class="ph ph-gavel"></i>
              <span>CCJs & charges</span>
            </div>
          </div>
          <div class="up-mini-actions">
            <button class="up-mini-btn-primary" id="up-mini-buy">
              <i class="ph ph-star"></i>
              Buy Credits
            </button>
            <button class="up-mini-btn-secondary" id="up-mini-learn">
              Learn More
            </button>
          </div>
        </div>
      `;

      this.miniDialogEl = el;

      // Insert after verdict card
      var verdictCard = document.getElementById('hero-verdict-card');
      if (verdictCard && verdictCard.parentNode) {
        verdictCard.parentNode.insertBefore(el, verdictCard.nextSibling);
      } else {
        document.body.appendChild(el);
      }

      // Animate in
      requestAnimationFrame(function () {
        el.classList.add('up-mini-visible');
      });

      // Bind buttons
      var buyBtn = document.getElementById('up-mini-buy');
      var learnBtn = document.getElementById('up-mini-learn');

      if (buyBtn) {
        buyBtn.addEventListener('click', function () {
          if (window.CompanyWisePurchase) {
            window.CompanyWisePurchase.open({ returnTo: company });
          }
        });
      }

      if (learnBtn) {
        learnBtn.addEventListener('click', function () {
          var pricing = document.getElementById('pricing');
          if (pricing) {
            pricing.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }
    },

    hideMiniDialog() {
      var el = document.getElementById('up-mini-dialog');
      if (el) {
        el.classList.remove('up-mini-visible');
        setTimeout(function () {
          el.remove();
        }, 300);
      }
      this.miniDialogEl = null;
    }
  };

  // Auto-dismiss mini-dialog when credits become available
  document.addEventListener('creditWalletChanged', function () {
    if (!UpgradePrompt.miniDialogEl) return;
    var Wallet = window.CompanyWiseWallet;
    if (Wallet && Wallet.getBalance() > 0) {
      UpgradePrompt.hideMiniDialog();
    }
  });

  window.CompanyWiseUpgrade = {
    showMiniDialog: function (company) { return UpgradePrompt.showMiniDialog(company); },
    hideMiniDialog: function () { return UpgradePrompt.hideMiniDialog(); }
  };

})();
