/* ============================================
   COMPANYWISE — account-modal.js
   Account info modal showing credit balance,
   unlocked reports, and wallet actions.

   Depends on: credit-wallet.js (window.CompanyWiseWallet)
               purchase-dialog.js (window.CompanyWisePurchase)
   ============================================ */

(function () {
  'use strict';

  var WALLET_KEY = 'companywise_wallet';
  var overlayEl = null;

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function ensureOverlay() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'am-overlay';
    overlayEl.innerHTML = '<div class="am-dialog"></div>';
    document.body.appendChild(overlayEl);

    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlayEl.classList.contains('am-active')) {
        close();
      }
    });

    document.addEventListener('creditWalletChanged', function () {
      if (overlayEl.classList.contains('am-active')) {
        renderContent();
      }
    });
  }

  function renderContent() {
    var Wallet = window.CompanyWiseWallet;
    var balance = Wallet ? Wallet.getBalance() : 0;
    var hasWallet = Wallet && Wallet.hasWallet();
    var history = Wallet ? Wallet.getHistory() : [];
    var dialog = overlayEl.querySelector('.am-dialog');

    var walletHTML = '';

    if (hasWallet) {
      var raw = localStorage.getItem(WALLET_KEY);
      var wallet = raw ? JSON.parse(raw) : null;
      var tier = wallet ? wallet.tier : '';
      var purchasedAt = wallet ? new Date(wallet.purchasedAt).toLocaleDateString() : '';
      var token = wallet ? Wallet._helpers.encodeSeed(wallet.seed, wallet.totalPurchased) : '';

      walletHTML = ''
        + '<div class="am-wallet-info">'
        + '  <div class="am-info-row">'
        + '    <span class="am-info-label">Tier</span>'
        + '    <span class="am-info-value">' + escapeHtml(tier.charAt(0).toUpperCase() + tier.slice(1)) + '</span>'
        + '  </div>'
        + '  <div class="am-info-row">'
        + '    <span class="am-info-label">Purchased</span>'
        + '    <span class="am-info-value">' + escapeHtml(purchasedAt) + '</span>'
        + '  </div>'
        + '  <div class="am-info-row">'
        + '    <span class="am-info-label">Total purchased</span>'
        + '    <span class="am-info-value">' + (wallet ? wallet.totalPurchased : 0) + ' credits</span>'
        + '  </div>'
        + '</div>'

        + '<div class="am-section">'
        + '  <h3 class="am-section-title">Recovery Token</h3>'
        + '  <div class="am-token-row">'
        + '    <code class="am-token">' + escapeHtml(token.substring(0, 24)) + '\u2026</code>'
        + '    <button class="am-copy-btn" data-am-token="' + escapeHtml(token) + '">'
        + '      <i class="ph ph-copy"></i> Copy'
        + '    </button>'
        + '  </div>'
        + '</div>'

        + '<div class="am-section">'
        + '  <h3 class="am-section-title">Unlocked Reports (' + history.length + ')</h3>';

      if (history.length > 0) {
        walletHTML += '<ul class="am-history">';
        for (var i = 0; i < history.length; i++) {
          var entry = history[i];
          walletHTML += ''
            + '<li class="am-history-item">'
            + '  <span class="am-company-number">' + escapeHtml(entry.companyNumber) + '</span>'
            + '  <span class="am-history-date">' + new Date(entry.spentAt).toLocaleDateString() + '</span>'
            + '</li>';
        }
        walletHTML += '</ul>';
      } else {
        walletHTML += '<p class="am-empty-text">No reports unlocked yet</p>';
      }

      walletHTML += '</div>'
        + '<div class="am-actions">'
        + '  <button class="am-btn am-btn-primary" data-am-buy>Buy More Credits</button>'
        + '  <button class="am-btn am-btn-secondary" data-am-export>'
        + '    <i class="ph ph-download-simple"></i> Export'
        + '  </button>'
        + '</div>';

    } else {
      walletHTML = ''
        + '<p class="am-empty-text">You haven\u2019t purchased any credits yet.</p>'
        + '<div class="am-actions">'
        + '  <button class="am-btn am-btn-primary" data-am-buy>Buy Credits</button>'
        + '</div>'

        + '<div class="am-recover">'
        + '  <div class="am-recover-divider">'
        + '    <span class="am-recover-divider-line"></span>'
        + '    <span class="am-recover-divider-text">or</span>'
        + '    <span class="am-recover-divider-line"></span>'
        + '  </div>'
        + '  <h3 class="am-section-title">Recover Account</h3>'
        + '  <p class="am-recover-hint">Paste your recovery token to restore your credits.</p>'
        + '  <div class="am-recover-field">'
        + '    <input class="am-recover-input" type="text" data-am-recover-input'
        + '      placeholder="Paste recovery token\u2026" autocomplete="off" spellcheck="false">'
        + '  </div>'
        + '  <div class="am-recover-message" data-am-recover-message></div>'
        + '  <button class="am-btn am-btn-secondary" data-am-recover>'
        + '    <i class="ph ph-arrow-counter-clockwise"></i> Recover'
        + '  </button>'
        + '</div>';
    }

    dialog.innerHTML = ''
      + '<div class="am-header">'
      + '  <h2 class="am-title"><i class="ph ph-wallet"></i> Your Account</h2>'
      + '  <button class="am-close" data-am-close aria-label="Close">'
      + '    <i class="ph ph-x"></i>'
      + '  </button>'
      + '</div>'
      + '<div class="am-balance-card">'
      + '  <i class="ph-fill ph-star am-balance-icon"></i>'
      + '  <span class="am-balance-count">' + balance + '</span>'
      + '  <span class="am-balance-label">credit' + (balance !== 1 ? 's' : '') + ' remaining</span>'
      + '</div>'
      + walletHTML;

    // Bind actions
    var closeBtn = dialog.querySelector('[data-am-close]');
    if (closeBtn) closeBtn.addEventListener('click', close);

    var buyBtn = dialog.querySelector('[data-am-buy]');
    if (buyBtn) {
      buyBtn.addEventListener('click', function () {
        close();
        if (window.CompanyWisePurchase) window.CompanyWisePurchase.open();
      });
    }

    var exportBtn = dialog.querySelector('[data-am-export]');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        if (!Wallet) return;
        var blob = Wallet.exportWallet();
        if (blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'companywise-wallet.json';
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    }

    var copyBtn = dialog.querySelector('[data-am-token]');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var tokenValue = copyBtn.getAttribute('data-am-token');
        navigator.clipboard.writeText(tokenValue).then(function () {
          copyBtn.innerHTML = '<i class="ph ph-check"></i> Copied';
          setTimeout(function () {
            copyBtn.innerHTML = '<i class="ph ph-copy"></i> Copy';
          }, 2000);
        });
      });
    }

    var recoverBtn = dialog.querySelector('[data-am-recover]');
    var recoverInput = dialog.querySelector('[data-am-recover-input]');
    var recoverMessage = dialog.querySelector('[data-am-recover-message]');

    if (recoverBtn && recoverInput) {
      recoverBtn.addEventListener('click', function () {
        var token = recoverInput.value.trim();
        if (!token) {
          recoverMessage.textContent = 'Please paste your recovery token.';
          recoverMessage.className = 'am-recover-message am-recover-message--error';
          recoverInput.focus();
          return;
        }

        var Wallet = window.CompanyWiseWallet;
        if (!Wallet) {
          recoverMessage.textContent = 'Wallet system unavailable. Try refreshing.';
          recoverMessage.className = 'am-recover-message am-recover-message--error';
          return;
        }

        var success = Wallet.recoverFromToken(token);
        if (!success) {
          recoverMessage.textContent = 'Invalid token. Please check and try again.';
          recoverMessage.className = 'am-recover-message am-recover-message--error';
        }
      });

      recoverInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          recoverBtn.click();
        }
      });
    }
  }

  function open() {
    ensureOverlay();
    renderContent();
    requestAnimationFrame(function () {
      overlayEl.classList.add('am-active');
      document.body.classList.add('modal-open');
    });
  }

  function close() {
    if (!overlayEl) return;
    overlayEl.classList.remove('am-active');
    document.body.classList.remove('modal-open');
  }

  window.CompanyWiseAccount = { open: open, close: close };

})();
