/* ============================================
   COMPANYWISE — hero.js
   Self-initializing hero component
   Depends on: hero/api.js, hero/search.js
   ============================================ */

(function () {
  'use strict';

  // ---- Utility ----
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---- Demo Card Data (marketing showcase — never hits the API) ----
  const DEMO_COMPANY = {
    name: 'Castle & Brook Construction Ltd',
    number: '14523678',
    activity: 'Residential building construction',
    type: 'Private Limited',
    location: 'Manchester',
    revenue: { current: 820000, prior: 1450000 },
    profitLoss: { current: -215000, prior: 42000 },
    netAssets: { current: -68000, prior: 180000 },
    cash: { current: 12400, prior: 95000 },
    employees: 6,
    accountsDate: null,
    period: '12 months',
    signals: [
      { label: 'Revenue \u2193', status: 'warning', icon: 'ph-trend-down' },
      { label: 'Loss-making', status: 'danger', icon: 'ph-x-circle' },
      { label: 'Negative assets', status: 'danger', icon: 'ph-shield-warning' },
      { label: 'Cash \u2193', status: 'warning', icon: 'ph-trend-down' },
    ],
  };

  // ---- Hero Component ----
  const Hero = {
    container: null,
    isLoading: false,
    currentCompany: null,

    // Card state: 'demo' | 'skeleton' | 'result'
    cardState: 'demo',
    unifiedCard: null,
    unifiedCardInner: null,

    // ---- Initialisation ----

    init(options = {}) {
      this.container = options.container || document.getElementById('hero-container');
      if (!this.container) return;

      this.render();
      this.initSearch();
      this.startAnimations();
    },

    // Wire up the search module
    initSearch() {
      const inputEl = document.getElementById('hero-search-input');
      const dropdownEl = document.getElementById('hero-search-dropdown');
      const errorEl = document.getElementById('hero-search-error');

      if (window.CompanyWiseSearch && inputEl && dropdownEl && errorEl) {
        window.CompanyWiseSearch.init({
          inputEl,
          dropdownEl,
          errorEl,
          onSelect: (company) => this.handleCompanySelected(company),
        });
      }
    },

    // ---- Company Selection (bridge between search and card) ----

    async handleCompanySelected(searchResult) {
      // searchResult = { company_number, name, jurisdiction }
      this.transitionToState('skeleton', null);
      this.setLoading(true);

      try {
        const data = await window.CompanyWiseAPI.getCompany(searchResult.company_number);
        this.currentCompany = data;

        // Fetch filing facts in parallel for the latest filing
        let factsData = null;
        const latestFiling = (data.filings || [])[0];
        if (latestFiling) {
          try {
            factsData = await window.CompanyWiseAPI.getFilingFacts(latestFiling.id);
          } catch (_) {
            // Non-critical — render card without financials
          }
        }
        data.facts = factsData;

        this.setLoading(false);
        this.transitionToState('result', data);
      } catch (err) {
        this.setLoading(false);
        this.transitionToState('demo', null);

        const errorEl = document.getElementById('hero-search-error');
        if (errorEl) {
          const msg = err.status === 404 ? 'Company not found' : 'Could not reach server \u2014 try again';
          errorEl.innerHTML = `<i class="ph ph-warning-circle"></i>${escapeHtml(msg)}`;
          errorEl.style.display = 'flex';
        }
      }
    },

    // ---- Rendering ----

    render() {
      this.container.innerHTML = `
        <section id="hero" class="hero">
          <!-- Chevron Background \u2014 Mobile -->
          <div class="hero-chevron-mobile"></div>

          <!-- Chevron Background \u2014 Desktop -->
          <div class="hero-chevrons">
            <div class="hero-chevron hero-chevron-primary"></div>
            <div class="hero-chevron hero-chevron-secondary"></div>
            <div class="hero-chevron hero-chevron-tertiary"></div>
          </div>

          <!-- Blur Accents -->
          <div class="hero-blur-accent hero-blur-accent--top"></div>
          <div class="hero-blur-accent hero-blur-accent--bottom"></div>

          <!-- Grid Pattern -->
          <div class="hero-grid-pattern"></div>

          <div class="hero-container">
            <div class="hero-grid">
              <!-- Left Column - Content -->
              <div class="hero-content">
                <!-- Headline -->
                <div>
                  <h1 class="hero-headline">
                    Trust data, not promises.
                    <span class="hero-headline-accent">Check any company's risk in seconds</span>
                  </h1>
                  <p class="hero-subheadline">
                    Before you quote, know if they'll pay. We scan Companies House data to help freelancers <strong>avoid bad clients</strong>.
                  </p>
                </div>

                <!-- Search -->
                <div class="hero-search-wrapper">
                  <form class="hero-search-form" id="hero-search-form">
                    <div class="hero-search-prefix">
                      <i class="ph ph-buildings"></i>
                    </div>
                    <input
                      id="hero-search-input"
                      class="hero-search-input"
                      type="text"
                      placeholder="Company name or number..."
                      autocomplete="off"
                      spellcheck="false"
                    >
                    <button type="submit" class="hero-search-btn" id="hero-search-btn">
                      Check company
                    </button>
                  </form>
                  <div id="hero-search-dropdown" class="hero-search-dropdown"></div>
                  <div id="hero-search-error" class="hero-search-error" style="display: none;"></div>
                </div>

                <p style="font-size: 0.75rem; color: var(--text-400); margin: 0;">
                  Try a company name or number (e.g. "00275446")
                </p>

                <!-- Check Types -->
                <div class="hero-check-types">
                  <p class="hero-check-types-label">We check:</p>
                  <div class="hero-check-types-icons">
                    <i class="ph ph-buildings" title="Limited Companies"></i>
                    <i class="ph ph-storefront" title="LLPs"></i>
                    <i class="ph ph-bank" title="PLCs"></i>
                    <i class="ph ph-globe" title="Overseas Companies"></i>
                  </div>
                </div>

                <!-- Feature Checklist -->
                <div class="hero-checklist">
                  <p class="hero-checklist-title">A CompanyWise check uncovers:</p>
                  <div class="hero-checklist-grid">
                    <div class="hero-checklist-item" data-delay="0">
                      <i class="ph ph-check-circle"></i>
                      <span>Overdue accounts</span>
                    </div>
                    <div class="hero-checklist-item" data-delay="80">
                      <i class="ph ph-check-circle"></i>
                      <span>Director history</span>
                    </div>
                    <div class="hero-checklist-item" data-delay="160">
                      <i class="ph ph-check-circle"></i>
                      <span>CCJs & charges</span>
                    </div>
                    <div class="hero-checklist-item" data-delay="240">
                      <i class="ph ph-check-circle"></i>
                      <span>Virtual office flags</span>
                    </div>
                    <div class="hero-checklist-item" data-delay="320">
                      <i class="ph ph-check-circle"></i>
                      <span>Company age</span>
                    </div>
                    <div class="hero-checklist-item" data-delay="400">
                      <i class="ph ph-check-circle"></i>
                      <span>and more...</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right Column - Card Stack Illustration -->
              <div class="hero-illustration">
                <div class="hero-card-stack">
                  <!-- Back Card - Depth -->
                  <div class="hero-card-back" id="hero-card-back"></div>

                  <!-- Unified Card -->
                  <div class="hero-unified-card" id="hero-unified-card">
                    <div class="hero-unified-card-inner" id="hero-unified-card-inner"></div>
                  </div>

                  <!-- Shadow Accent -->
                  <div class="hero-shadow-accent"></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      `;

      // Cache DOM references
      this.unifiedCard = document.getElementById('hero-unified-card');
      this.unifiedCardInner = document.getElementById('hero-unified-card-inner');

      // Populate demo card
      this.renderDemoCard();
    },

    // ---- Card Templates ----

    // Demo card: marketing showcase using the same layout as result card
    renderDemoCard() {
      this.cardState = 'demo';
      const c = DEMO_COMPANY;
      const inner = this.unifiedCardInner;

      // Build snapshot tiles using demo data
      const demoTiles = [
        { label: 'Revenue', current: c.revenue.current, prior: c.revenue.prior, invert: false },
        { label: c.profitLoss.current >= 0 ? 'Profit' : 'Loss', current: c.profitLoss.current, prior: c.profitLoss.prior, invert: true },
        { label: 'Net Assets', current: c.netAssets.current, prior: c.netAssets.prior, invert: false },
        { label: 'Cash', current: c.cash.current, prior: c.cash.prior, invert: false },
      ];

      const snapshotHtml = `
        <div class="hero-result-snapshot">
          ${demoTiles.map((t) => `
            <div class="hero-snapshot-tile">
              <span class="hero-snapshot-label">${t.label}</span>
              <span class="hero-snapshot-value${t.current < 0 ? ' hero-snapshot-value--negative' : ''}">${this.formatGBP(t.current)}</span>
              ${this.renderTrendArrow(t.current, t.prior, t.invert)}
            </div>
          `).join('')}
        </div>
      `;

      const signalsHtml = `
        <div class="hero-result-signals">
          ${c.signals.map((s) => `<span class="hero-signal hero-signal--${s.status}"><i class="ph ${s.icon}"></i>${s.label}</span>`).join('')}
        </div>
      `;

      inner.innerHTML = `
        <div class="hero-unified-demo-label"><i class="ph ph-sparkle"></i> Sample Company Check</div>
        <div class="hero-result-activity"><i class="ph ph-briefcase"></i> ${escapeHtml(c.activity)}</div>
        <div class="hero-unified-header">
          <div>
            <h3 class="hero-unified-company-name">${escapeHtml(c.name)}</h3>
            <p class="hero-unified-company-meta">${escapeHtml(c.number)} &middot; ${escapeHtml(c.type)} &middot; ${escapeHtml(c.location)}</p>
          </div>
        </div>
        ${snapshotHtml}
        <div class="hero-unified-meta-row">
          <div class="hero-unified-meta-item">
            <span class="hero-unified-meta-label">Employees</span>
            <div class="hero-unified-meta-value">${c.employees}</div>
          </div>
          <div class="hero-unified-meta-item">
            <span class="hero-unified-meta-label">Accounts Date</span>
            <div class="hero-unified-meta-value">Never filed</div>
          </div>
          <div class="hero-unified-meta-item">
            <span class="hero-unified-meta-label">Period</span>
            <div class="hero-unified-meta-value">${c.period}</div>
          </div>
        </div>
        ${signalsHtml}
        <div class="hero-result-teasers">
          <div class="hero-result-teaser">
            <i class="ph ph-file-text"></i>
            <span><strong>Free Report</strong> &mdash; Full P&amp;L, balance sheet, directors, cash flow analysis</span>
          </div>
          <div class="hero-result-teaser">
            <i class="ph ph-star"></i>
            <span><strong>Premium</strong> &mdash; Risk scoring, red flag detection, sector benchmarks</span>
          </div>
        </div>
        <div class="hero-unified-actions">
          <button class="hero-unified-btn hero-unified-btn--secondary" id="hero-view-free-btn">
            <i class="ph ph-file-text"></i>
            Free Report
          </button>
          <button class="hero-unified-btn hero-unified-btn--primary" id="hero-view-premium-btn">
            <i class="ph ph-star"></i>
            Premium Report
          </button>
        </div>
      `;

      requestAnimationFrame(() => {
        inner.classList.add('hero-unified-card-inner--visible');
      });
    },

    // Result card: real API data enriched with filing facts
    renderResultCard(data) {
      this.cardState = 'result';
      const inner = this.unifiedCardInner;
      const company = data.company;
      const filings = data.filings || [];
      const latest = filings[0] || null;
      const figures = this.extractKeyFigures(data);

      const filingDate = latest
        ? new Date(latest.balance_sheet_date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : 'No filings';
      const period = this.getPeriodLabel(latest);

      // Build enriched meta line
      const metaParts = [company.company_number];
      if (figures?.companyType) metaParts.push(figures.companyType);
      else if (company.jurisdiction) metaParts.push(company.jurisdiction);
      if (figures?.address) metaParts.push(figures.address);
      const metaLine = metaParts.map(escapeHtml).join(' &middot; ');

      // Activity pill
      const activityHtml = figures?.activity
        ? `<div class="hero-result-activity"><i class="ph ph-briefcase"></i> ${escapeHtml(figures.activity)}</div>`
        : '';

      // Financial snapshot tiles (2x2)
      const snapshotHtml = figures ? this.renderFinancialSnapshot(figures) : '';

      // Health signals
      const signals = figures ? this.buildHealthSignals(figures) : [];
      const signalsHtml = signals.length > 0
        ? `<div class="hero-result-signals">${signals.map((s) => `<span class="hero-signal hero-signal--${s.status}"><i class="ph ${s.icon}"></i>${s.label}</span>`).join('')}</div>`
        : '';

      // Employees
      const empVal = figures?.employees?.current?.value;
      const employeesHtml = empVal != null ? `${Math.round(empVal)}` : '\u2014';

      inner.classList.remove('hero-unified-card-inner--visible');

      inner.innerHTML = `
        ${activityHtml}
        <div class="hero-unified-header">
          <div>
            <h3 class="hero-unified-company-name">${escapeHtml(company.name || company.company_number)}</h3>
            <p class="hero-unified-company-meta">${metaLine}</p>
          </div>
        </div>
        ${snapshotHtml}
        <div class="hero-unified-meta-row">
          <div class="hero-unified-meta-item">
            <span class="hero-unified-meta-label">Employees</span>
            <div class="hero-unified-meta-value">${employeesHtml}</div>
          </div>
          <div class="hero-unified-meta-item">
            <span class="hero-unified-meta-label">Accounts Date</span>
            <div class="hero-unified-meta-value">${filingDate}</div>
          </div>
          <div class="hero-unified-meta-item">
            <span class="hero-unified-meta-label">Period</span>
            <div class="hero-unified-meta-value">${period}</div>
          </div>
        </div>
        ${signalsHtml}
        <div class="hero-result-teasers">
          <div class="hero-result-teaser">
            <i class="ph ph-file-text"></i>
            <span><strong>Free Report</strong> &mdash; Full P&amp;L, balance sheet, directors, cash flow analysis</span>
          </div>
          <div class="hero-result-teaser">
            <i class="ph ph-star"></i>
            <span><strong>Premium</strong> &mdash; Risk scoring, red flag detection, sector benchmarks</span>
          </div>
        </div>
        <div class="hero-unified-actions">
          <button class="hero-unified-btn hero-unified-btn--secondary" id="hero-view-free-btn">
            <i class="ph ph-file-text"></i>
            Free Report
          </button>
          <button class="hero-unified-btn hero-unified-btn--primary" id="hero-view-premium-btn">
            <i class="ph ph-star"></i>
            Premium Report
          </button>
        </div>
      `;

      requestAnimationFrame(() => {
        inner.classList.add('hero-unified-card-inner--visible');
      });

      this.bindResultCardButtons(company);
    },

    renderFinancialSnapshot(figures) {
      const tiles = [];

      // Revenue
      const revCur = figures.revenue.current?.value;
      const revPri = figures.revenue.prior?.value;
      if (revCur != null) {
        tiles.push({
          label: 'Revenue',
          value: this.formatGBP(revCur),
          trend: this.renderTrendArrow(revCur, revPri, false),
          negative: revCur < 0,
        });
      }

      // Profit / Loss
      const plCur = figures.profitLoss.current?.value;
      const plPri = figures.profitLoss.prior?.value;
      if (plCur != null) {
        tiles.push({
          label: plCur >= 0 ? 'Profit' : 'Loss',
          value: this.formatGBP(plCur),
          trend: this.renderTrendArrow(plCur, plPri, true),
          negative: plCur < 0,
        });
      }

      // Net Assets
      const naCur = figures.netAssets.current?.value;
      const naPri = figures.netAssets.prior?.value;
      if (naCur != null) {
        tiles.push({
          label: 'Net Assets',
          value: this.formatGBP(naCur),
          trend: this.renderTrendArrow(naCur, naPri, false),
          negative: naCur < 0,
        });
      }

      // Cash
      const cashCur = figures.cash.current?.value;
      const cashPri = figures.cash.prior?.value;
      if (cashCur != null) {
        tiles.push({
          label: 'Cash',
          value: this.formatGBP(cashCur),
          trend: this.renderTrendArrow(cashCur, cashPri, false),
          negative: cashCur < 0,
        });
      }

      if (tiles.length === 0) return '';

      return `
        <div class="hero-result-snapshot">
          ${tiles.map((t) => `
            <div class="hero-snapshot-tile">
              <span class="hero-snapshot-label">${t.label}</span>
              <span class="hero-snapshot-value${t.negative ? ' hero-snapshot-value--negative' : ''}">${t.value}</span>
              ${t.trend}
            </div>
          `).join('')}
        </div>
      `;
    },

    // Skeleton loading state — matches enriched result card shape
    renderSkeletonCard() {
      this.cardState = 'skeleton';
      const inner = this.unifiedCardInner;

      inner.innerHTML = `
        <div class="hero-skel hero-skel--pill" style="width:40%; margin-bottom:0.75rem"></div>
        <div class="hero-unified-header">
          <div style="flex:1">
            <div class="hero-skel hero-skel--title"></div>
            <div class="hero-skel hero-skel--text-sm" style="width:70%"></div>
          </div>
        </div>
        <div class="hero-result-snapshot">
          <div class="hero-snapshot-tile"><div class="hero-skel hero-skel--text-xs" style="width:50%"></div><div class="hero-skel hero-skel--text-lg"></div></div>
          <div class="hero-snapshot-tile"><div class="hero-skel hero-skel--text-xs" style="width:40%"></div><div class="hero-skel hero-skel--text-lg"></div></div>
          <div class="hero-snapshot-tile"><div class="hero-skel hero-skel--text-xs" style="width:55%"></div><div class="hero-skel hero-skel--text-lg"></div></div>
          <div class="hero-snapshot-tile"><div class="hero-skel hero-skel--text-xs" style="width:35%"></div><div class="hero-skel hero-skel--text-lg"></div></div>
        </div>
        <div class="hero-unified-meta-row">
          <div class="hero-unified-meta-item">
            <div class="hero-skel hero-skel--text-xs"></div>
            <div class="hero-skel hero-skel--text-sm"></div>
          </div>
          <div class="hero-unified-meta-item">
            <div class="hero-skel hero-skel--text-xs"></div>
            <div class="hero-skel hero-skel--text-sm"></div>
          </div>
          <div class="hero-unified-meta-item">
            <div class="hero-skel hero-skel--text-xs"></div>
            <div class="hero-skel hero-skel--text-sm"></div>
          </div>
        </div>
        <div style="display:flex; gap:0.375rem; margin-bottom:0.75rem">
          <div class="hero-skel hero-skel--signal"></div>
          <div class="hero-skel hero-skel--signal"></div>
          <div class="hero-skel hero-skel--signal"></div>
        </div>
        <div style="margin-bottom:0.75rem">
          <div class="hero-skel hero-skel--text-sm" style="width:90%; margin-bottom:0.375rem"></div>
          <div class="hero-skel hero-skel--text-sm" style="width:80%"></div>
        </div>
        <div class="hero-unified-actions">
          <div class="hero-skel hero-skel--btn"></div>
          <div class="hero-skel hero-skel--btn"></div>
        </div>
      `;

      inner.classList.remove('hero-unified-card-inner--visible');
      requestAnimationFrame(() => {
        inner.classList.add('hero-unified-card-inner--visible');
      });
    },

    // ---- Card Transitions ----

    transitionToState(state, data) {
      const inner = this.unifiedCardInner;

      // Fade out current content
      inner.classList.remove('hero-unified-card-inner--visible');

      setTimeout(() => {
        if (state === 'skeleton') {
          this.renderSkeletonCard();
        } else if (state === 'result') {
          this.renderResultCard(data);
        } else {
          this.renderDemoCard();
        }
      }, 250);
    },

    // ---- Button Binding ----

    bindResultCardButtons(company) {
      const freeBtn = document.getElementById('hero-view-free-btn');
      if (freeBtn) {
        freeBtn.addEventListener('click', () => {
          if (window.CompanyWiseModal) {
            window.CompanyWiseModal.open(company.company_number);
          }
        });
      }

      const premiumBtn = document.getElementById('hero-view-premium-btn');
      if (premiumBtn) {
        premiumBtn.addEventListener('click', () => {
          if (window.CompanyWisePricing) {
            window.CompanyWisePricing.scrollTo();
          } else {
            const pricingSection = document.getElementById('pricing');
            if (pricingSection) pricingSection.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }
    },

    // ---- Loading State ----

    setLoading(loading) {
      this.isLoading = loading;
      const input = document.getElementById('hero-search-input');
      const btn = document.getElementById('hero-search-btn');

      if (input) input.disabled = loading;
      if (btn) {
        btn.disabled = loading;
        btn.innerHTML = loading
          ? '<div class="hero-search-spinner"></div><span>Checking...</span>'
          : 'Check company';
      }
    },

    // ---- Animations ----

    startAnimations() {
      // Reveal blur accents
      setTimeout(() => {
        document.querySelectorAll('.hero-blur-accent').forEach((el) => {
          el.classList.add('visible');
        });
      }, 100);

      // Animate checklist items
      const checkItems = document.querySelectorAll('.hero-checklist-item');
      checkItems.forEach((item, i) => {
        const delay = parseInt(item.dataset.delay) || i * 80;
        setTimeout(() => {
          item.classList.add('visible');
        }, 400 + delay);
      });

      // Card stack
      this.animateCardStack();
    },

    animateCardStack() {
      const backCard = document.getElementById('hero-card-back');
      const unifiedCard = document.getElementById('hero-unified-card');

      setTimeout(() => {
        if (backCard) backCard.classList.add('visible');
      }, 0);

      setTimeout(() => {
        if (unifiedCard) unifiedCard.classList.add('visible');
      }, 300);
    },

    // ---- Fact Extraction Helpers ----

    /**
     * Pull a single consolidated numeric fact for a given concept and period.
     * Prefers the broadest consolidated match (bus:Consolidated dimension only).
     * Falls back to no-dimension facts if consolidated not found.
     */
    getNumericFact(facts, concept, periodStart, periodEnd, instantDate) {
      if (!facts || !facts.numeric_facts) return null;

      let best = null;
      for (const f of facts.numeric_facts) {
        if (f.concept !== concept) continue;

        // Match period
        if (periodStart && periodEnd) {
          if (f.start_date !== periodStart || f.end_date !== periodEnd) continue;
        } else if (instantDate) {
          if (f.instant_date !== instantDate) continue;
        }

        const dims = this.parseDimensions(f.dimensions);
        const members = dims.map((d) => d.member);
        const hasConsolidated = members.includes('bus:Consolidated');
        const extraDims = dims.filter((d) => d.dimension !== 'bus:GroupCompanyDataDimension');

        // Best match: consolidated with no extra dimensions
        if (hasConsolidated && extraDims.length === 0) return f;
        // Fallback: no dimensions at all
        if (dims.length === 0 && !best) best = f;
      }
      return best;
    },

    getTextFact(facts, concept) {
      if (!facts || !facts.text_facts) return null;
      for (const f of facts.text_facts) {
        if (f.concept !== concept || !f.value) continue;
        return f.value;
      }
      return null;
    },

    getTextFactByDimension(facts, concept, memberSubstring) {
      if (!facts || !facts.text_facts) return null;
      for (const f of facts.text_facts) {
        if (f.concept !== concept || !f.value) continue;
        if (memberSubstring && f.dimensions && f.dimensions.includes(memberSubstring)) return f.value;
        if (!memberSubstring && !f.dimensions) return f.value;
      }
      return null;
    },

    parseDimensions(dimStr) {
      if (!dimStr) return [];
      try {
        const d = typeof dimStr === 'string' ? JSON.parse(dimStr) : dimStr;
        return d.explicit || [];
      } catch (_) {
        return [];
      }
    },

    /**
     * Extract the key headline figures from filing facts.
     * Returns an object with current/prior values for each metric.
     */
    extractKeyFigures(data) {
      const facts = data.facts;
      const filing = (data.filings || [])[0];
      if (!facts || !filing) return null;

      const cur = { start: filing.period_start_date, end: filing.period_end_date, instant: filing.balance_sheet_date };

      // Derive prior period from contexts or date math
      const prior = this.derivePriorPeriod(facts, cur);

      const get = (concept, type) => {
        if (type === 'duration') {
          return {
            current: this.getNumericFact(facts, concept, cur.start, cur.end, null),
            prior: prior ? this.getNumericFact(facts, concept, prior.start, prior.end, null) : null,
          };
        }
        return {
          current: this.getNumericFact(facts, concept, null, null, cur.instant),
          prior: prior ? this.getNumericFact(facts, concept, null, null, prior.instant) : null,
        };
      };

      return {
        revenue: get('TurnoverRevenue', 'duration'),
        profitLoss: get('ProfitLoss', 'duration'),
        netAssets: get('NetAssetsLiabilities', 'instant'),
        cash: get('CashCashEquivalents', 'instant'),
        employees: get('AverageNumberEmployeesDuringPeriod', 'duration'),
        activity: this.getTextFact(facts, 'DescriptionPrincipalActivities'),
        companyType: this.getTextFactByDimension(facts, 'LegalFormEntity', 'PrivateLimited') ? 'Private Limited'
          : this.getTextFactByDimension(facts, 'LegalFormEntity', 'PublicLimited') ? 'Public Limited'
          : null,
        address: this.buildAddressSummary(facts),
      };
    },

    derivePriorPeriod(facts, cur) {
      // Look for a duration context whose end_date matches the day before our start_date (approx)
      if (!facts.contexts) return null;
      for (const ctx of facts.contexts) {
        if (ctx.period_type === 'duration' && ctx.end_date && ctx.end_date !== cur.end && ctx.start_date !== cur.start) {
          // Check this looks like a prior-year period (roughly 1 year before)
          const priorEnd = new Date(ctx.end_date);
          const curStart = new Date(cur.start);
          const diffDays = (curStart - priorEnd) / (1000 * 60 * 60 * 24);
          if (diffDays >= -5 && diffDays <= 5) {
            // Also find the matching instant date
            return { start: ctx.start_date, end: ctx.end_date, instant: ctx.end_date };
          }
        }
      }
      return null;
    },

    buildAddressSummary(facts) {
      const city = this.getTextFactByDimension(facts, 'PrincipalLocation-CityOrTown', 'RegisteredOffice');
      const county = this.getTextFactByDimension(facts, 'CountyRegion', 'RegisteredOffice');
      const parts = [city, county].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : null;
    },

    // ---- Formatting Helpers ----

    formatGBP(value) {
      if (value == null) return '\u2014';
      const abs = Math.abs(value);
      const sign = value < 0 ? '-' : '';
      if (abs >= 1_000_000) return `${sign}\u00A3${(abs / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${sign}\u00A3${(abs / 1_000).toFixed(0)}K`;
      return `${sign}\u00A3${abs.toFixed(0)}`;
    },

    calcYoY(current, prior) {
      if (!current || !prior || prior === 0) return null;
      return ((current - prior) / Math.abs(prior)) * 100;
    },

    /**
     * Build health signal pills from key figures.
     * Returns array of { label, status: 'good'|'warning'|'danger', icon }
     */
    buildHealthSignals(figures) {
      const signals = [];
      if (!figures) return signals;

      // Revenue trend
      const revCur = figures.revenue.current?.value;
      const revPri = figures.revenue.prior?.value;
      if (revCur != null && revPri != null) {
        const pct = this.calcYoY(revCur, revPri);
        signals.push({
          label: pct >= 0 ? 'Revenue \u2191' : 'Revenue \u2193',
          status: pct >= 0 ? 'good' : 'warning',
          icon: pct >= 0 ? 'ph-trend-up' : 'ph-trend-down',
        });
      }

      // Profitability
      const pl = figures.profitLoss.current?.value;
      if (pl != null) {
        signals.push({
          label: pl >= 0 ? 'Profitable' : 'Loss-making',
          status: pl >= 0 ? 'good' : 'danger',
          icon: pl >= 0 ? 'ph-check-circle' : 'ph-x-circle',
        });
      }

      // Balance sheet
      const na = figures.netAssets.current?.value;
      if (na != null) {
        signals.push({
          label: na >= 0 ? 'Positive assets' : 'Negative assets',
          status: na >= 0 ? 'good' : 'danger',
          icon: na >= 0 ? 'ph-shield-check' : 'ph-shield-warning',
        });
      }

      // Cash trend
      const cashCur = figures.cash.current?.value;
      const cashPri = figures.cash.prior?.value;
      if (cashCur != null && cashPri != null) {
        const pct = this.calcYoY(cashCur, cashPri);
        signals.push({
          label: pct >= 0 ? 'Cash \u2191' : 'Cash \u2193',
          status: pct >= 0 ? 'good' : 'warning',
          icon: pct >= 0 ? 'ph-trend-up' : 'ph-trend-down',
        });
      }

      return signals;
    },

    renderTrendArrow(currentVal, priorVal, invertLogic) {
      const pct = this.calcYoY(currentVal, priorVal);
      if (pct == null) return '';
      // For losses: a decrease in magnitude is good (invertLogic = true)
      const isPositive = invertLogic ? pct <= 0 : pct >= 0;
      const arrow = pct >= 0 ? '\u2191' : '\u2193';
      const cls = isPositive ? 'hero-trend--good' : 'hero-trend--bad';
      return `<span class="hero-trend ${cls}">${arrow} ${Math.abs(pct).toFixed(0)}%</span>`;
    },

    // ---- Helpers ----

    getPeriodLabel(filing) {
      if (!filing || !filing.period_start_date || !filing.period_end_date) return '\u2014';
      const start = new Date(filing.period_start_date);
      const end = new Date(filing.period_end_date);
      const months = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.44));
      return `${months} months`;
    },
  };

  // ---- Export and Auto-Initialize ----
  window.CompanyWiseHero = {
    initHero: (options) => Hero.init(options),
    Hero: Hero,
  };

  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('hero-container');
    if (container) {
      Hero.init({ container });
    }
  });
})();
