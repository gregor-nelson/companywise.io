/* ============================================
   COMPANYWISE — purchase-dialog.js
   Credit purchase checkout modal
   3-step flow: Tier selection → Payment → Delivery
   Self-initializing with public API

   Depends on: credit-wallet.js (window.CompanyWiseWallet)
   ============================================ */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Tier data (mirrors pricing.js)
  // ---------------------------------------------------------------------------

  const TIERS = [
    {
      key: 'starter',
      name: 'Starter',
      credits: 10,
      price: 5,
      perCheck: '0.50',
      icon: 'ph-rocket',
      popular: false,
    },
    {
      key: 'standard',
      name: 'Standard',
      credits: 25,
      price: 10,
      perCheck: '0.40',
      icon: 'ph-star',
      popular: true,
    },
    {
      key: 'pro',
      name: 'Pro',
      credits: 60,
      price: 20,
      perCheck: '0.33',
      icon: 'ph-crown',
      popular: false,
    },
  ];

  // ---------------------------------------------------------------------------
  // Purchase Dialog Component
  // ---------------------------------------------------------------------------

  const PurchaseDialog = {
    container: null,
    isOpen: false,
    step: 1,            // 1=tiers, 2=payment, 3=delivery
    selectedTier: null,
    options: {},
    deliveryResult: null,

    // ---- Lifecycle ----

    init() {
      this.createContainer();
      this.bindGlobalEvents();
    },

    createContainer() {
      const el = document.createElement('div');
      el.id = 'pd-root';
      document.body.appendChild(el);
      this.container = el;
    },

    bindGlobalEvents() {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
    },

    // ---- Public API ----

    open(options) {
      options = options || {};
      this.options = options;
      this.step = 1;
      this.deliveryResult = null;

      // Pre-select tier if specified
      if (options.tier) {
        this.selectedTier = TIERS.find(t => t.key === options.tier) || TIERS[1];
      } else {
        this.selectedTier = TIERS[1]; // default to Standard
      }

      this.render();
      this.show();
    },

    close() {
      this.hide();
    },

    // ---- Rendering ----

    render() {
      if (this.step === 1) this.renderTierStep();
      else if (this.step === 2) this.renderPaymentStep();
      else if (this.step === 3) this.renderDeliveryStep();

      this.bindEvents();
    },

    renderTierStep() {
      this.container.innerHTML = `
        <div class="pd-overlay" id="pd-overlay">
          <div class="pd-backdrop" id="pd-backdrop"></div>
          <div class="pd-dialog">

            <div class="pd-header">
              <h3 class="pd-header-title">Buy Credits</h3>
              <button class="pd-close" id="pd-close" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>

            <div class="pd-body">
              ${this.renderStepDots()}

              <div class="pd-tiers">
                ${TIERS.map(tier => `
                  <div class="pd-tier ${this.selectedTier && this.selectedTier.key === tier.key ? 'selected' : ''}"
                       data-tier="${tier.key}">
                    ${tier.popular ? '<div class="pd-tier-popular">Most Popular</div>' : ''}
                    <div class="pd-tier-radio"></div>
                    <div class="pd-tier-info">
                      <div class="pd-tier-name">
                        <i class="ph ${tier.icon}"></i>
                        ${tier.name}
                      </div>
                      <div class="pd-tier-desc">${tier.credits} credits · £${tier.perCheck}/check</div>
                    </div>
                    <div class="pd-tier-price">
                      <div class="pd-tier-amount">£${tier.price}</div>
                      <div class="pd-tier-per">one-off</div>
                    </div>
                  </div>
                `).join('')}
              </div>

              <button class="pd-btn-primary" id="pd-continue">
                Continue
              </button>
            </div>

          </div>
        </div>
      `;
    },

    renderPaymentStep() {
      const tier = this.selectedTier;
      this.container.innerHTML = `
        <div class="pd-overlay" id="pd-overlay">
          <div class="pd-backdrop" id="pd-backdrop"></div>
          <div class="pd-dialog">

            <div class="pd-header">
              <h3 class="pd-header-title">Payment</h3>
              <button class="pd-close" id="pd-close" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>

            <div class="pd-body">
              ${this.renderStepDots()}

              <button class="pd-back" id="pd-back">
                <i class="ph ph-caret-left"></i> Back
              </button>

              <div class="pd-summary">
                <span class="pd-summary-credits">
                  <i class="ph ${tier.icon}"></i>
                  ${tier.name} · ${tier.credits} credits
                </span>
                <span class="pd-summary-total">£${tier.price}</span>
              </div>

              <form class="pd-form" id="pd-form">
                <div class="pd-field">
                  <label class="pd-label">Email</label>
                  <input class="pd-input" type="email" id="pd-email" placeholder="you@company.com" required>
                </div>

                <div class="pd-field">
                  <label class="pd-label">Name on card</label>
                  <input class="pd-input" type="text" id="pd-name" placeholder="J. Smith" required>
                </div>

                <div class="pd-field">
                  <label class="pd-label">Card number</label>
                  <input class="pd-input" type="text" id="pd-card" placeholder="4242 4242 4242 4242" maxlength="19" required>
                </div>

                <div class="pd-card-row">
                  <div class="pd-field">
                    <label class="pd-label">Expiry</label>
                    <input class="pd-input" type="text" id="pd-expiry" placeholder="MM / YY" maxlength="7" required>
                  </div>
                  <div class="pd-field">
                    <label class="pd-label">CVC</label>
                    <input class="pd-input" type="text" id="pd-cvc" placeholder="123" maxlength="4" required>
                  </div>
                </div>

                <div class="pd-form-notice">
                  <i class="ph ph-lock-simple"></i>
                  Demo mode — no real payment is processed
                </div>

                <button type="submit" class="pd-btn-primary" id="pd-pay">
                  <i class="ph ph-credit-card"></i>
                  Pay £${tier.price}
                </button>
              </form>
            </div>

          </div>
        </div>
      `;
    },

    renderDeliveryStep() {
      const result = this.deliveryResult;
      const tier = this.selectedTier;

      this.container.innerHTML = `
        <div class="pd-overlay" id="pd-overlay">
          <div class="pd-backdrop" id="pd-backdrop"></div>
          <div class="pd-dialog">

            <div class="pd-header">
              <h3 class="pd-header-title">Your Credits</h3>
              <button class="pd-close" id="pd-close" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>

            <div class="pd-body">
              ${this.renderStepDots()}

              <div class="pd-delivery">
                <div class="pd-delivery-icon">
                  <i class="ph ph-check-fat"></i>
                </div>
                <h3 class="pd-delivery-title">${tier.credits} credits added</h3>
                <p class="pd-delivery-subtitle">Your wallet is ready to use</p>

                <div class="pd-passphrase">
                  <div class="pd-passphrase-label">Recovery Passphrase</div>
                  <div class="pd-passphrase-words">${result.passphrase}</div>
                </div>

                <div class="pd-token-box">
                  <div class="pd-token-label">Wallet Token</div>
                  <div class="pd-token-value" id="pd-token-value">${result.token}</div>
                  <button class="pd-token-copy" id="pd-copy-token">
                    <i class="ph ph-copy"></i> Copy
                  </button>
                </div>

                <div class="pd-warning">
                  <i class="ph ph-warning"></i>
                  <span>Save your recovery passphrase or wallet token — it's your only way to recover credits if you clear your browser data.</span>
                </div>

                <div class="pd-delivery-actions">
                  <button class="pd-btn-primary" id="pd-done">
                    Done
                  </button>
                  <button class="pd-btn-secondary" id="pd-download">
                    <i class="ph ph-download-simple"></i>
                    Download Wallet File
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      `;
    },

    renderStepDots() {
      const labels = ['Select', 'Pay', 'Wallet'];
      return `
        <div class="pd-steps">
          ${labels.map((_, i) => {
            const stepNum = i + 1;
            let cls = 'pd-step-dot';
            if (stepNum < this.step) cls += ' completed';
            else if (stepNum === this.step) cls += ' active';
            return `<div class="${cls}"></div>`;
          }).join('')}
        </div>
      `;
    },

    // ---- Events ----

    bindEvents() {
      const overlay = document.getElementById('pd-overlay');
      const backdrop = document.getElementById('pd-backdrop');
      const closeBtn = document.getElementById('pd-close');

      if (closeBtn) closeBtn.addEventListener('click', () => this.close());
      if (backdrop) backdrop.addEventListener('click', () => this.close());

      // Step 1: Tier selection
      if (this.step === 1) {
        this.container.querySelectorAll('.pd-tier').forEach(el => {
          el.addEventListener('click', () => {
            const key = el.dataset.tier;
            this.selectedTier = TIERS.find(t => t.key === key);
            // Update visual selection
            this.container.querySelectorAll('.pd-tier').forEach(t => t.classList.remove('selected'));
            el.classList.add('selected');
          });
        });

        const continueBtn = document.getElementById('pd-continue');
        if (continueBtn) {
          continueBtn.addEventListener('click', () => {
            if (!this.selectedTier) return;
            this.step = 2;
            this.render();
            // Re-show overlay
            requestAnimationFrame(() => {
              document.getElementById('pd-overlay')?.classList.add('active');
            });
          });
        }
      }

      // Step 2: Payment form
      if (this.step === 2) {
        const backBtn = document.getElementById('pd-back');
        if (backBtn) {
          backBtn.addEventListener('click', () => {
            this.step = 1;
            this.render();
            requestAnimationFrame(() => {
              document.getElementById('pd-overlay')?.classList.add('active');
            });
          });
        }

        const form = document.getElementById('pd-form');
        if (form) {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.processMockPayment();
          });
        }
      }

      // Step 3: Delivery
      if (this.step === 3) {
        const copyBtn = document.getElementById('pd-copy-token');
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            const tokenEl = document.getElementById('pd-token-value');
            if (tokenEl && navigator.clipboard) {
              navigator.clipboard.writeText(tokenEl.textContent).then(() => {
                copyBtn.innerHTML = '<i class="ph ph-check"></i> Copied!';
                setTimeout(() => {
                  copyBtn.innerHTML = '<i class="ph ph-copy"></i> Copy';
                }, 2000);
              });
            }
          });
        }

        const downloadBtn = document.getElementById('pd-download');
        if (downloadBtn) {
          downloadBtn.addEventListener('click', () => {
            this.downloadWallet();
          });
        }

        const doneBtn = document.getElementById('pd-done');
        if (doneBtn) {
          doneBtn.addEventListener('click', () => {
            this.close();
          });
        }
      }
    },

    // ---- Actions ----

    processMockPayment() {
      if (!this.selectedTier || !window.CompanyWiseWallet) return;

      const result = window.CompanyWiseWallet.purchaseCredits(
        this.selectedTier.credits,
        this.selectedTier.key
      );

      this.deliveryResult = result;
      this.step = 3;
      this.render();

      requestAnimationFrame(() => {
        document.getElementById('pd-overlay')?.classList.add('active');
      });
    },

    downloadWallet() {
      if (!window.CompanyWiseWallet) return;

      const blob = window.CompanyWiseWallet.exportWallet();
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'companywise-wallet.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // ---- Show / Hide ----

    show() {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        document.getElementById('pd-overlay')?.classList.add('active');
      });
      this.isOpen = true;
    },

    hide() {
      const overlay = document.getElementById('pd-overlay');
      if (overlay) overlay.classList.remove('active');

      document.body.classList.remove('modal-open');

      setTimeout(() => {
        this.container.innerHTML = '';
        this.step = 1;
        this.deliveryResult = null;
        this.options = {};
      }, 300);

      this.isOpen = false;
    },
  };

  // ---- Export Global API ----
  window.CompanyWisePurchase = {
    open: (options) => PurchaseDialog.open(options),
    close: () => PurchaseDialog.close(),
    isOpen: () => PurchaseDialog.isOpen,
  };

  // ---- Auto-Initialize ----
  document.addEventListener('DOMContentLoaded', () => {
    PurchaseDialog.init();
  });

})();
