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

    // ---- Inline Mode ----
    // Renders a blur overlay + lock icon + CTA over a container
    renderInline(container, options) {
      if (!container) return;

      options = options || {};
      var title = options.title || 'Premium Content';
      var hasCredits = options.hasCredits || false;
      var onUnlock = options.onUnlock || null;

      // Add blur to existing content
      container.style.position = 'relative';
      var existingContent = container.querySelector('.up-inline-content');
      if (!existingContent) {
        // Wrap existing children in a blurred container
        var wrapper = document.createElement('div');
        wrapper.className = 'up-inline-content';
        while (container.firstChild) {
          wrapper.appendChild(container.firstChild);
        }
        container.appendChild(wrapper);
      }

      // Remove any existing overlay
      var existing = container.querySelector('.up-inline-overlay');
      if (existing) existing.remove();

      var overlay = document.createElement('div');
      overlay.className = 'up-inline-overlay';
      overlay.innerHTML = `
        <div class="up-inline-card">
          <div class="up-inline-icon">
            <i class="ph ph-lock-simple"></i>
          </div>
          <h4 class="up-inline-title">${title}</h4>
          <p class="up-inline-desc">
            ${hasCredits
              ? 'Use 1 credit to unlock this section'
              : 'Purchase credits to access premium data'}
          </p>
          <button class="up-inline-btn">
            <i class="ph ${hasCredits ? 'ph-lock-simple-open' : 'ph-star'}"></i>
            ${hasCredits ? 'Unlock with 1 Credit' : 'Get Credits'}
          </button>
        </div>
      `;
      container.appendChild(overlay);

      var btn = overlay.querySelector('.up-inline-btn');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (hasCredits && onUnlock) {
          onUnlock();
        } else if (window.CompanyWisePurchase) {
          window.CompanyWisePurchase.open();
        }
      });
    },

    // Remove inline overlay from a container
    removeInline(container) {
      if (!container) return;
      var overlay = container.querySelector('.up-inline-overlay');
      if (overlay) overlay.remove();

      // Unwrap the blurred content
      var wrapper = container.querySelector('.up-inline-content');
      if (wrapper) {
        wrapper.classList.remove('up-inline-content');
      }
    },

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
              <p class="up-mini-desc">Get the full analysis for ${companyName}</p>
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
            window.CompanyWisePurchase.open();
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

  window.CompanyWiseUpgrade = {
    renderInline: function (container, options) { return UpgradePrompt.renderInline(container, options); },
    removeInline: function (container) { return UpgradePrompt.removeInline(container); },
    showMiniDialog: function (company) { return UpgradePrompt.showMiniDialog(company); },
    hideMiniDialog: function () { return UpgradePrompt.hideMiniDialog(); }
  };

})();
