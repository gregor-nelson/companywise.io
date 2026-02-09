/* ============================================
   COMPANYWISE — hero/search.js
   Debounced search input, dropdown, selection
   Depends on: hero/api.js (CompanyWiseAPI)
   ============================================ */

(function () {
  'use strict';

  const DEBOUNCE_MS = 300;
  const MIN_CHARS = 2;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  const Search = {
    inputEl: null,
    dropdownEl: null,
    errorEl: null,
    onSelect: null,
    debounceTimer: null,
    lastResults: [],

    /**
     * Initialise the search module.
     * @param {Object} opts
     * @param {HTMLInputElement} opts.inputEl
     * @param {HTMLElement} opts.dropdownEl
     * @param {HTMLElement} opts.errorEl
     * @param {Function} opts.onSelect - Called with { company_number, name, jurisdiction }
     */
    init(opts) {
      this.inputEl = opts.inputEl;
      this.dropdownEl = opts.dropdownEl;
      this.errorEl = opts.errorEl;
      this.onSelect = opts.onSelect;
      this.lastResults = [];

      this.bindEvents();
    },

    bindEvents() {
      // Debounced input
      this.inputEl.addEventListener('input', () => {
        this.hideError();
        clearTimeout(this.debounceTimer);
        const query = this.inputEl.value.trim();

        if (query.length < MIN_CHARS) {
          this.closeDropdown();
          return;
        }

        this.debounceTimer = setTimeout(() => this.executeSearch(query), DEBOUNCE_MS);
      });

      // Re-show dropdown on focus if we have results
      this.inputEl.addEventListener('focus', () => {
        if (this.inputEl.value.trim().length >= MIN_CHARS && this.lastResults.length > 0) {
          this.renderDropdown(this.lastResults);
        }
      });

      // Form submit (parent form handles preventDefault)
      this.inputEl.closest('form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.hero-search-wrapper')) {
          this.closeDropdown();
        }
      });

      // Escape key
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeDropdown();
      });
    },

    async executeSearch(query) {
      this.showDropdownLoading();
      try {
        const results = await window.CompanyWiseAPI.searchCompanies(query);
        this.lastResults = results;
        this.renderDropdown(results);
      } catch (err) {
        this.lastResults = [];
        this.closeDropdown();
        this.showError('Could not reach server \u2014 try again');
      }
    },

    handleSubmit() {
      const query = this.inputEl.value.trim();

      if (query.length < MIN_CHARS) {
        this.showError('Please enter at least 2 characters');
        return;
      }

      // If we already have results from debounced search, use them
      if (this.lastResults.length === 1) {
        this.select(this.lastResults[0]);
      } else if (this.lastResults.length > 1) {
        this.renderDropdown(this.lastResults);
      } else {
        // No cached results — fire a search now
        this.executeSearch(query);
      }
    },

    renderDropdown(results) {
      if (results.length === 0) {
        this.dropdownEl.innerHTML = `
          <div class="hero-search-dropdown-list">
            <div class="hero-search-dropdown-item" style="cursor: default;">
              <span>No companies found \u2014 try a different name or number</span>
            </div>
          </div>`;
        this.dropdownEl.classList.add('active');
        return;
      }

      const query = this.inputEl.value;
      const total = results.length;
      const label = total === 1 ? '1 company found' : `${total} companies found`;

      this.dropdownEl.innerHTML = `
        <div class="hero-search-dropdown-list">
          ${results
            .map(
              (c) => `
              <div class="hero-search-dropdown-item" data-number="${escapeHtml(c.company_number)}">
                <div>
                  <div class="company-name">${this.highlight(c.name || '', query)}</div>
                  <div class="company-number">${escapeHtml(c.company_number)}${c.jurisdiction ? ' \u00b7 ' + escapeHtml(c.jurisdiction) : ''}</div>
                </div>
                <i class="ph ph-arrow-right company-arrow"></i>
              </div>`
            )
            .join('')}
        </div>
        <div class="hero-search-dropdown-footer">
          <i class="ph ph-magnifying-glass"></i>${label}
        </div>`;

      this.dropdownEl.classList.add('active');

      // Bind click handlers
      this.dropdownEl.querySelectorAll('.hero-search-dropdown-item[data-number]').forEach((item) => {
        item.addEventListener('click', () => {
          const company = results.find((c) => c.company_number === item.dataset.number);
          if (company) this.select(company);
        });
      });
    },

    highlight(text, query) {
      if (!query) return escapeHtml(text);
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      return escapeHtml(text).replace(regex, '<mark>$1</mark>');
    },

    select(company) {
      this.inputEl.value = company.name || company.company_number;
      this.closeDropdown();
      if (this.onSelect) this.onSelect(company);
    },

    showDropdownLoading() {
      const rows = Array.from({ length: 3 }, () => `
        <div class="hero-search-dropdown-loading-row">
          <div>
            <div class="skel-text skel-name"></div>
            <div class="skel-text skel-meta"></div>
          </div>
        </div>`).join('');

      this.dropdownEl.innerHTML = `<div class="hero-search-dropdown-loading">${rows}</div>`;
      this.dropdownEl.classList.add('active');
    },

    closeDropdown() {
      this.dropdownEl.classList.remove('active');
    },

    showError(message) {
      this.errorEl.innerHTML = `<i class="ph ph-warning-circle"></i>${escapeHtml(message)}`;
      this.errorEl.style.display = 'flex';
    },

    hideError() {
      this.errorEl.style.display = 'none';
    }
  };

  window.CompanyWiseSearch = {
    init: (opts) => Search.init(opts),
    Search: Search
  };
})();
