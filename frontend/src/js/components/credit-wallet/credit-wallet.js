/**
 * CompanyWise Credit Wallet
 *
 * Hash-chain credit system — pure data/service layer, no DOM rendering.
 * Adapted from the ArchitectureDemo React component to vanilla JS.
 *
 * All wallet state lives in localStorage. In production the server would
 * store only (chainId, anchor, remaining) and the client would hold the
 * seed externally via a wallet token. For this scaffold phase everything
 * is client-side.
 *
 * Exposes: window.CompanyWiseWallet
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const WALLET_KEY = 'companywise_wallet';
  const FREE_CHECKS_KEY = 'companywise_free_checks';
  const FREE_CHECKS_PER_MONTH = 3;

  const WORDLIST = [
    'amber','arctic','atlas','blade','bloom','brass','brisk','calm','cedar','chase',
    'cliff','cloud','coral','crisp','dawn','delta','drift','dusk','echo','ember',
    'fable','fern','flame','flint','frost','gale','ghost','gleam','globe','grain',
    'grove','haze','heath','hive','ivory','jade','jazz','jewel','karma','kelp',
    'lance','lark','lava','leaf','lunar','maple','marsh','mesa','mist','moss',
    'noble','north','nova','oasis','olive','onyx','orbit','palm','pearl','pixel',
    'plume','pond','prism','pulse','quartz','quest','rain','reef','ridge','ripple',
  ];

  // ---------------------------------------------------------------------------
  // Crypto helpers (demo-grade — mirrors ArchitectureDemo exactly)
  // ---------------------------------------------------------------------------

  function simpleHash(input) {
    var h = 0x811c9dc5;
    for (var i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    var hex = '';
    var state = h;
    for (var j = 0; j < 32; j++) {
      state = Math.imul(state, 0x45d9f3b) ^ (state >>> 16);
      hex += ((state >>> 0) & 0xff).toString(16).padStart(2, '0');
      state ^= h + j;
    }
    return hex.substring(0, 64);
  }

  function generateChain(seed, levels) {
    var hashes = [seed];
    for (var i = 0; i < levels; i++) {
      hashes.push(simpleHash(hashes[hashes.length - 1]));
    }
    return hashes; // [seed, H(seed), H^2(seed), ... H^n(seed)]
  }

  function hashToWords(hex) {
    var words = [];
    for (var i = 0; i < 4; i++) {
      var val = parseInt(hex.substring(i * 4, i * 4 + 4), 16);
      words.push(WORDLIST[val % WORDLIST.length]);
    }
    return words.join('-');
  }

  function encodeSeed(seed, credits) {
    return btoa(JSON.stringify({ s: seed, n: credits, v: 1 }));
  }

  function decodeSeed(token) {
    try {
      var data = JSON.parse(atob(token));
      return { seed: data.s, credits: data.n, version: data.v };
    } catch (e) {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // localStorage helpers
  // ---------------------------------------------------------------------------

  function loadWallet() {
    try {
      var raw = localStorage.getItem(WALLET_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveWallet(wallet) {
    localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  }

  function loadFreeChecks() {
    try {
      var raw = localStorage.getItem(FREE_CHECKS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveFreeChecks(data) {
    localStorage.setItem(FREE_CHECKS_KEY, JSON.stringify(data));
  }

  function currentMonth() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  // ---------------------------------------------------------------------------
  // Event dispatch
  // ---------------------------------------------------------------------------

  function dispatchChange(wallet, action) {
    document.dispatchEvent(new CustomEvent('creditWalletChanged', {
      detail: {
        remaining: wallet ? wallet.remaining : 0,
        totalPurchased: wallet ? wallet.totalPurchased : 0,
        lastAction: action,
      },
    }));
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  var Wallet = {

    /** Check if a wallet exists in localStorage */
    hasWallet: function () {
      return loadWallet() !== null;
    },

    /** Get remaining credit balance (0 if no wallet) */
    getBalance: function () {
      var w = loadWallet();
      return w ? w.remaining : 0;
    },

    /**
     * Purchase credits — generates a hash chain and stores the wallet.
     * @param {number} creditCount - Number of credits to purchase
     * @param {string} tier - Tier name (starter|standard|pro)
     * @returns {{ token: string, passphrase: string, chainId: string }}
     */
    purchaseCredits: function (creditCount, tier) {
      var seed = 'cw_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 14);
      var chain = generateChain(seed, creditCount);
      var anchor = chain[creditCount]; // top of chain = H^n(seed)
      var chainId = 'ch_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      var token = encodeSeed(seed, creditCount);
      var passphrase = hashToWords(simpleHash(seed));

      var wallet = {
        chainId: chainId,
        seed: seed,
        anchor: anchor,
        remaining: creditCount,
        totalPurchased: creditCount,
        tier: tier,
        purchasedAt: new Date().toISOString(),
        spentOn: [],
      };

      saveWallet(wallet);
      dispatchChange(wallet, 'purchase');

      return {
        token: token,
        passphrase: passphrase,
        chainId: chainId,
      };
    },

    /**
     * Spend 1 credit to unlock a company report.
     * Verifies the hash chain: H(presented) must equal current anchor.
     * @param {string} companyNumber
     * @returns {boolean} true if credit was spent successfully
     */
    spendCredit: function (companyNumber) {
      var wallet = loadWallet();
      if (!wallet || wallet.remaining <= 0) return false;

      // Already unlocked — don't double-spend
      if (this.hasAccess(companyNumber)) return true;

      // Rebuild chain to get the next hash to present
      var chain = generateChain(wallet.seed, wallet.totalPurchased);
      var presentIndex = wallet.remaining - 1;
      var presentedHash = chain[presentIndex];

      // Verify: H(presented) should equal current anchor
      var hashed = simpleHash(presentedHash);
      if (hashed !== wallet.anchor) {
        // Chain integrity failure — should not happen in normal operation
        console.error('[CreditWallet] Chain verification failed');
        return false;
      }

      // Update anchor and decrement
      wallet.anchor = presentedHash;
      wallet.remaining -= 1;
      wallet.spentOn.push({
        companyNumber: companyNumber,
        spentAt: new Date().toISOString(),
        hashIndex: presentIndex,
      });

      saveWallet(wallet);
      dispatchChange(wallet, 'spend');
      return true;
    },

    /**
     * Check if a specific company has already been unlocked.
     * @param {string} companyNumber
     * @returns {boolean}
     */
    hasAccess: function (companyNumber) {
      var wallet = loadWallet();
      if (!wallet) return false;
      return wallet.spentOn.some(function (entry) {
        return entry.companyNumber === companyNumber;
      });
    },

    /**
     * Recover wallet from a base64 wallet token.
     * Rebuilds the chain and restores state.
     * @param {string} token - base64-encoded wallet token
     * @returns {boolean} true if recovery succeeded
     */
    recoverFromToken: function (token) {
      var decoded = decodeSeed(token);
      if (!decoded || !decoded.seed || !decoded.credits) return false;

      var chain = generateChain(decoded.seed, decoded.credits);
      var anchor = chain[decoded.credits];
      var chainId = 'ch_recovered_' + Date.now().toString(36);

      var wallet = {
        chainId: chainId,
        seed: decoded.seed,
        anchor: anchor,
        remaining: decoded.credits,
        totalPurchased: decoded.credits,
        tier: 'recovered',
        purchasedAt: new Date().toISOString(),
        spentOn: [],
      };

      saveWallet(wallet);
      dispatchChange(wallet, 'recover');
      return true;
    },

    /**
     * Get the spend history.
     * @returns {Array<{ companyNumber: string, spentAt: string }>}
     */
    getHistory: function () {
      var wallet = loadWallet();
      return wallet ? wallet.spentOn : [];
    },

    /**
     * Export wallet as a downloadable JSON Blob.
     * @returns {Blob}
     */
    exportWallet: function () {
      var wallet = loadWallet();
      if (!wallet) return null;

      var exportData = {
        version: 1,
        chainId: wallet.chainId,
        token: encodeSeed(wallet.seed, wallet.totalPurchased),
        passphrase: hashToWords(simpleHash(wallet.seed)),
        remaining: wallet.remaining,
        totalPurchased: wallet.totalPurchased,
        purchasedAt: wallet.purchasedAt,
        exportedAt: new Date().toISOString(),
      };

      return new Blob(
        [JSON.stringify(exportData, null, 2)],
        { type: 'application/json' }
      );
    },

    /**
     * Get number of free checks remaining this month.
     * @returns {number}
     */
    getFreeChecksRemaining: function () {
      var data = loadFreeChecks();
      var month = currentMonth();

      if (!data || data.month !== month) {
        return FREE_CHECKS_PER_MONTH;
      }
      return Math.max(0, FREE_CHECKS_PER_MONTH - data.count);
    },

    /**
     * Use one free check. Returns false if none remaining.
     * @returns {boolean}
     */
    useFreeCheck: function () {
      var month = currentMonth();
      var data = loadFreeChecks();

      if (!data || data.month !== month) {
        data = { month: month, count: 0 };
      }

      if (data.count >= FREE_CHECKS_PER_MONTH) return false;

      data.count += 1;
      saveFreeChecks(data);
      return true;
    },

    /**
     * Clear wallet (dev/testing helper).
     */
    clearWallet: function () {
      localStorage.removeItem(WALLET_KEY);
      localStorage.removeItem(FREE_CHECKS_KEY);
      dispatchChange(null, 'clear');
    },

    // Expose crypto helpers for other components that may need them
    _helpers: {
      simpleHash: simpleHash,
      generateChain: generateChain,
      hashToWords: hashToWords,
      encodeSeed: encodeSeed,
      decodeSeed: decodeSeed,
    },
  };

  // Register synchronously so it's available before DOMContentLoaded
  window.CompanyWiseWallet = Wallet;

})();
