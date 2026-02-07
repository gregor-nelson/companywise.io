/* ============================================
   COMPANYWISE — header.js
   Unified Header Controller (adapted from Motorwise)

   Single vanilla JS header for all pages.
   All navigation uses window.location.href (full page loads).

   Usage:
   initHeader({ container }) - Initialize header in the given container
   ============================================ */

/* ============================================
   CONFIGURATION
   ============================================ */

const CONFIG = {
  timing: 200,
  swipe: { threshold: 60 },
};

/* ============================================
   UTILITIES
   ============================================ */

function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

const NAV_DATA = {
  actions: [
    {
      id: 'check',
      label: 'Check a Company',
      description: 'Free risk verdict for UK companies',
      icon: 'ph-magnifying-glass',
      color: 'blue',
      submitText: 'Check',
      placeholder: 'Company name or number…',
    },
  ],

  utilities: [
    { label: 'Overdue Accounts', href: '#what-we-check', icon: 'ph-calendar-x' },
    { label: 'Director History', href: '#what-we-check', icon: 'ph-user-switch' },
    { label: 'CCJs & Charges', href: '#what-we-check', icon: 'ph-gavel' },
    { label: 'Virtual Office', href: '#what-we-check', icon: 'ph-buildings' },
    { label: 'Company Age', href: '#what-we-check', icon: 'ph-clock-countdown' },
    { label: 'Financial Health', href: '#what-we-check', icon: 'ph-trend-up' },
  ],

  links: [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ],

  footer: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Contact', href: '/contact' },
  ],

  dropdowns: {
    resources: [
      { label: 'How it works', href: '#how-it-works', icon: 'ph-steps' },
      { label: 'What we check', href: '#what-we-check', icon: 'ph-detective' },
      { label: 'Pricing', href: '#pricing', icon: 'ph-coins' },
      { label: 'FAQ', href: '#faq', icon: 'ph-question' },
    ],
  },

  primaryNav: [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ],
};

const FOCUS_SEARCH_LABELS = ['Check a Company'];

/* ============================================
   STATE
   ============================================ */

let state = {
  isOpen: false,
  isAnimating: false,
  activeAction: null,
  activeDropdown: null,
  currentPath: '/',
};

let elements = {
  container: null,
  header: null,
  drawer: null,
  backdrop: null,
  hamburger: null,
  actionElements: new Map(),
  dropdownElements: new Map(),
  cards: [],
};

let callbacks = {
  onNavigate: null,
  onSearch: null,
};

let touchStartY = 0;
let boundDocumentClick = null;
let boundDocumentKeydown = null;

/* ============================================
   HTML GENERATION
   ============================================ */

function generateHeaderHTML() {
  const { primaryNav, dropdowns } = NAV_DATA;

  return `
    <!-- Header -->
    <header
      id="header-root"
      class="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-between px-4 md:px-6 lg:px-8 border-b border-neutral-100"
    >
      <!-- Logo -->
      <a
        href="/"
        data-logo
        class="flex flex-col justify-center transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 rounded"
        aria-label="CompanyWise — Will this company pay your invoice?"
      >
        <h2 class="text-xl font-medium text-neutral-900 leading-tight tracking-tight m-0 font-jost">
          company<span class="text-blue-500 relative inline-block">w<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-80"></span></span>ise
        </h2>
        <p class="text-xs text-neutral-600 mt-0.5 font-jost">Check first. Invoice with confidence</p>
      </a>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center gap-1">
        ${primaryNav
          .map(
            (item) => `
          <a href="${item.href}" data-nav-item data-label="${item.label}" class="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-50">
            ${item.label}
          </a>
        `
          )
          .join('')}

        <div class="w-px h-5 mx-2 bg-neutral-200"></div>
        <div id="header-credit-badge" class="flex items-center"></div>
        <a href="/login" data-nav-item data-label="Log in" class="px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-50">Log in</a>
        <a href="#" data-nav-item data-label="Get started" class="ml-1 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-blue-500/25">
          Get started
        </a>
      </nav>

      <!-- Hamburger -->
      <button
        id="hamburger-btn"
        class="hamburger-btn md:hidden flex items-center justify-center w-11 h-11 rounded-xl text-neutral-700 hover:bg-neutral-50 hover:text-blue-600 transition-colors"
        aria-label="Open menu"
        aria-expanded="false"
        aria-controls="nav-drawer"
      >
        <div class="hamburger-lines w-5 h-3.5 flex flex-col justify-between">
          <span class="hamburger-line block h-0.5 w-full bg-current rounded-full"></span>
          <span class="hamburger-line block h-0.5 w-full bg-current rounded-full"></span>
          <span class="hamburger-line block h-0.5 w-full bg-current rounded-full"></span>
        </div>
      </button>
    </header>

    <!-- Backdrop -->
    <div
      id="nav-backdrop"
      class="fixed inset-0 z-40 md:hidden bg-black/50"
      style="opacity: 0; pointer-events: none;"
      aria-hidden="true"
    ></div>

    <!-- Drawer -->
    <div
      id="nav-drawer"
      class="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style="transform: translateY(100%); pointer-events: none;"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      aria-hidden="true"
    ></div>

    <!-- Spacer for fixed header -->
    <div class="h-16"></div>
  `;
}

function generateDrawerHTML() {
  const { actions, utilities, links, footer } = NAV_DATA;

  return `
    <div class="drawer-inner bg-gradient-to-b from-blue-50 to-white rounded-t-3xl shadow-2xl">
      <div class="flex justify-center pt-3 pb-2">
        <div class="w-10 h-1 bg-neutral-300 rounded-full"></div>
      </div>

      <div class="drawer-content px-4 pt-2 pb-8 max-h-[70vh] overflow-y-auto overscroll-contain">

        <div class="space-y-3 mb-5">
          ${actions.map((action, i) => generateActionCardHTML(action, i)).join('')}
        </div>

        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 h-px bg-neutral-200"></div>
          <span class="text-xs text-neutral-400 font-medium uppercase tracking-wide">What we check</span>
          <div class="flex-1 h-px bg-neutral-200"></div>
        </div>

        <div class="tools-scroll-container flex gap-3 mb-3 overflow-x-auto pb-2 -mx-4 pl-4 pr-4" data-tools-scroll>
          ${utilities
            .map(
              (item) => `
            <a
              href="${item.href}"
              data-nav-card
              data-label="${item.label}"
              class="nav-card nav-card-utility group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-white/90 border border-neutral-100 shadow-sm hover:shadow-md hover:bg-white active:scale-[0.97] flex-shrink-0 w-28"
            >
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50 flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200 group-hover:border-blue-300/50">
                <i class="ph ${item.icon} text-lg text-blue-600 group-hover:text-blue-700"></i>
              </div>
              <span class="text-xs font-medium text-neutral-700 text-center leading-tight">${item.label}</span>
            </a>
          `
            )
            .join('')}
        </div>

        <div class="flex justify-center gap-1.5 mb-5" data-tools-dots></div>

        <div class="flex items-center justify-center gap-4 mb-5 py-2">
          ${links
            .map(
              (link, i) => `
            ${i > 0 ? '<span class="text-neutral-300">·</span>' : ''}
            <a href="${link.href}" data-nav-link class="text-sm font-medium text-neutral-600 hover:text-blue-600">${link.label}</a>
          `
            )
            .join('')}
        </div>

        <!-- Auth buttons -->
        <div class="flex gap-3 mb-5">
          <a href="/login" data-nav-link class="flex-1 text-center py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50">Log in</a>
          <a href="/signup" data-nav-link class="flex-1 text-center py-2.5 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600">Get started</a>
        </div>

        <div class="flex justify-center gap-4 pt-3 border-t border-neutral-100">
          ${footer
            .map(
              (link) => `
            <a href="${link.href}" data-nav-link class="text-xs text-neutral-400 hover:text-blue-600">${link.label}</a>
          `
            )
            .join('')}
        </div>

      </div>

      <div style="height: env(safe-area-inset-bottom, 0)"></div>
    </div>
  `;
}

function generateActionCardHTML(action, index) {
  return `
    <div>
      <div
        data-action-card="${action.id}"
        class="action-card nav-card rounded-2xl bg-white shadow-lg border border-neutral-100 border-l-4 border-l-blue-400 overflow-hidden"
      >
        <button
          type="button"
          data-action-toggle="${action.id}"
          class="action-toggle w-full flex items-center gap-4 p-4 text-left hover:bg-neutral-50 active:bg-neutral-100"
        >
          <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 shadow-md">
            <i class="ph ${action.icon} text-lg text-white"></i>
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-sm font-medium text-neutral-900">${action.label}</span>
            <span class="block text-xs text-neutral-500">${action.description}</span>
          </div>
          <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-100 action-chevron">
            <i class="ph ph-caret-down text-neutral-500 text-sm"></i>
          </div>
        </button>

        <div class="action-input-section">
          <div class="action-input-inner">
            <div class="px-4 pb-4 pt-1">
              <form data-action-form="${action.id}" class="flex gap-0 bg-white rounded-xl shadow-md border border-neutral-200 overflow-hidden">
                <div class="flex items-center justify-center px-3 bg-blue-500 text-white">
                  <i class="ph-bold ph-buildings text-lg"></i>
                </div>
                <input
                  type="text"
                  data-action-input="${action.id}"
                  placeholder="${action.placeholder}"
                  autocomplete="off"
                  spellcheck="false"
                  class="flex-1 px-3 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none min-w-0"
                  aria-label="Company name or Companies House number"
                />
                <button type="submit" class="px-4 py-3.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium whitespace-nowrap transition-colors">
                  ${action.submitText}
                </button>
              </form>
              <div data-action-error="${action.id}" class="hidden mt-2 text-xs text-red-500 flex items-center gap-1.5">
                <i class="ph ph-warning-circle text-sm"></i>
                <span></span>
              </div>
              <p class="text-xs text-neutral-400 mt-2 text-center">Companies House data · 5M+ companies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ============================================
   ELEMENT CACHING
   ============================================ */

function cacheElements() {
  elements.header = document.getElementById('header-root');
  elements.drawer = document.getElementById('nav-drawer');
  elements.backdrop = document.getElementById('nav-backdrop');
  elements.hamburger = document.getElementById('hamburger-btn');

  elements.cards = elements.drawer?.querySelectorAll('.nav-card') || [];
  const actionCards = elements.drawer?.querySelectorAll('[data-action-card]') || [];

  actionCards.forEach((card) => {
    const id = card.dataset.actionCard;
    elements.actionElements.set(id, {
      card,
      inputSection: card.querySelector('.action-input-section'),
      chevron: card.querySelector('.action-chevron'),
      input: card.querySelector(`[data-action-input="${id}"]`),
      error: card.querySelector(`[data-action-error="${id}"]`),
      form: card.querySelector(`[data-action-form="${id}"]`),
    });
  });

  if (elements.header) {
    elements.header.querySelectorAll('[data-dropdown]').forEach((dropdown) => {
      const name = dropdown.dataset.dropdown;
      elements.dropdownElements.set(name, {
        container: dropdown,
        toggle: dropdown.querySelector('[data-dropdown-toggle]'),
        menu: dropdown.querySelector('[data-dropdown-menu]'),
      });
    });
  }
}

/* ============================================
   EVENT BINDING
   ============================================ */

function bindEvents() {
  elements.drawer?.addEventListener('click', onDrawerClick);
  elements.drawer?.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
  elements.drawer?.addEventListener('touchend', onTouchEnd, { passive: true });
  elements.backdrop?.addEventListener('click', () => state.isOpen && closeDrawer());

  elements.hamburger?.addEventListener('click', onHamburgerClick);
  elements.header?.addEventListener('click', onHeaderClick);

  boundDocumentClick = onDocumentClick;
  boundDocumentKeydown = (e) => {
    if (e.key === 'Escape') {
      if (state.isOpen) closeDrawer();
      else if (state.activeDropdown) closeDropdown();
    }
  };
  document.addEventListener('click', boundDocumentClick);
  document.addEventListener('keydown', boundDocumentKeydown);

  elements.actionElements.forEach((el, id) => {
    el.form?.addEventListener('submit', (e) => onFormSubmit(e, id));
  });

  // Tools carousel dots
  const scroller = elements.drawer?.querySelector('[data-tools-scroll]');
  const dotsContainer = elements.drawer?.querySelector('[data-tools-dots]');
  if (scroller && dotsContainer) {
    const dotCount = 2;
    for (let i = 0; i < dotCount; i++) {
      const dot = document.createElement('div');
      dot.className = `w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-neutral-300'}`;
      dotsContainer.appendChild(dot);
    }
    const dots = dotsContainer.children;
    scroller.addEventListener(
      'scroll',
      throttle(() => {
        const page = Math.round(scroller.scrollLeft / scroller.offsetWidth);
        for (let i = 0; i < dots.length; i++) {
          dots[i].className = `w-1.5 h-1.5 rounded-full ${i === page ? 'bg-blue-500' : 'bg-neutral-300'}`;
        }
      }, 50),
      { passive: true }
    );
  }

  // Scroll effect for header
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (elements.header) {
          const scrolled = window.scrollY > 40;
          elements.header.classList.toggle('header-scrolled', scrolled);
        }
        ticking = false;
      });
      ticking = true;
    }
  });
}

/* ============================================
   HAMBURGER
   ============================================ */

function onHamburgerClick() {
  toggleDrawer();
}

/* ============================================
   DESKTOP DROPDOWNS
   ============================================ */

function onHeaderClick(e) {
  const toggle = e.target.closest('[data-dropdown-toggle]');
  if (toggle) {
    e.preventDefault();
    e.stopPropagation();
    toggleDropdown(toggle.dataset.dropdownToggle);
    return;
  }

  const dropdownItem = e.target.closest('[data-dropdown-item]');
  if (dropdownItem) {
    e.preventDefault();
    closeDropdown();
    handleNavigation(dropdownItem.getAttribute('href'), dropdownItem.dataset.label);
    return;
  }

  const navItem = e.target.closest('[data-nav-item]');
  if (navItem) {
    e.preventDefault();
    handleNavigation(navItem.getAttribute('href'), navItem.dataset.label);
    return;
  }

  const logo = e.target.closest('[data-logo]');
  if (logo) {
    e.preventDefault();
    handleNavigation('/', 'Home');
  }
}

function onDocumentClick(e) {
  if (state.activeDropdown && !e.target.closest('[data-dropdown]')) {
    closeDropdown();
  }
}

function toggleDropdown(name) {
  if (state.activeDropdown === name) {
    closeDropdown();
  } else {
    closeDropdown();
    elements.dropdownElements.get(name)?.container.classList.add('is-open');
    state.activeDropdown = name;
  }
}

function closeDropdown() {
  if (!state.activeDropdown) return;
  elements.dropdownElements.get(state.activeDropdown)?.container.classList.remove('is-open');
  state.activeDropdown = null;
}

/* ============================================
   DRAWER CLICKS
   ============================================ */

function onDrawerClick(e) {
  const actionToggle = e.target.closest('[data-action-toggle]');
  if (actionToggle) {
    e.preventDefault();
    toggleAction(actionToggle.dataset.actionToggle);
    return;
  }

  const card = e.target.closest('[data-nav-card]');
  if (card) {
    e.preventDefault();
    const href = card.getAttribute('href');
    if (href) closeDrawer(() => handleNavigation(href, card.dataset.label));
    return;
  }

  const link = e.target.closest('[data-nav-link]');
  if (link) {
    e.preventDefault();
    const href = link.getAttribute('href');
    closeDrawer(() => handleNavigation(href, link.textContent));
  }
}

/* ============================================
   ACCORDION
   ============================================ */

function toggleAction(actionId) {
  if (state.activeAction === actionId) {
    collapseAction(actionId);
    state.activeAction = null;
  } else {
    if (state.activeAction) collapseAction(state.activeAction);
    expandAction(actionId);
    state.activeAction = actionId;
  }
}

function expandAction(actionId) {
  const el = elements.actionElements.get(actionId);
  if (!el) return;

  requestAnimationFrame(() => {
    el.card.classList.add('is-expanded');
    el.inputSection.classList.add('expanded');
  });

  const onTransitionEnd = () => {
    el.inputSection.removeEventListener('transitionend', onTransitionEnd);
    el.input?.focus();
  };
  el.inputSection.addEventListener('transitionend', onTransitionEnd, { once: true });
}

function collapseAction(actionId) {
  const el = elements.actionElements.get(actionId);
  if (!el) return;

  requestAnimationFrame(() => {
    el.card.classList.remove('is-expanded');
    el.inputSection.classList.remove('expanded');
    if (el.input) el.input.value = '';
    el.error?.classList.add('hidden');
  });
}

/* ============================================
   FORM HANDLING
   ============================================ */

function onFormSubmit(e, actionId) {
  e.preventDefault();

  const el = elements.actionElements.get(actionId);
  if (!el) return;

  const value = el.input?.value.trim() || '';

  if (!value) {
    showError(actionId, 'Please enter a company name or number');
    el.input?.focus();
    return;
  }

  el.error?.classList.add('hidden');

  closeDrawer(() => {
    if (callbacks.onSearch) {
      callbacks.onSearch(value);
    } else {
      // For now, scroll to hero and populate search
      const heroInput = document.getElementById('search-input');
      if (heroInput) {
        heroInput.value = value;
        heroInput.dispatchEvent(new Event('input'));
        heroInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  });
}

function showError(actionId, message) {
  const error = elements.actionElements.get(actionId)?.error;
  if (!error) return;
  error.classList.remove('hidden');
  const span = error.querySelector('span');
  if (span) span.textContent = message;
}

/* ============================================
   NAVIGATION
   ============================================ */

function handleNavigation(href, label) {
  // "Get started" → open purchase dialog instead of dead /signup
  if (label === 'Get started') {
    if (window.CompanyWisePurchase) {
      window.CompanyWisePurchase.open();
    }
    return;
  }

  // Anchor links — smooth scroll
  if (href.startsWith('#')) {
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }

  // Focus search on "Check a Company"
  if (FOCUS_SEARCH_LABELS.includes(label)) {
    const heroInput = document.getElementById('search-input');
    if (heroInput) {
      heroInput.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

  // Full page navigation
  window.location.href = href;
}

/* ============================================
   TOUCH — Swipe to close
   ============================================ */

function onTouchEnd(e) {
  if (!state.isOpen) return;
  const diff = e.changedTouches[0].clientY - touchStartY;
  if (diff > CONFIG.swipe.threshold) closeDrawer();
}

/* ============================================
   DRAWER OPEN/CLOSE
   ============================================ */

function openDrawer(callback) {
  if (state.isAnimating || state.isOpen || !elements.backdrop || !elements.drawer) return;
  state.isAnimating = true;

  if (state.activeAction) {
    collapseAction(state.activeAction);
    state.activeAction = null;
  }

  requestAnimationFrame(() => {
    document.body.style.overflow = 'hidden';
    elements.backdrop.style.cssText = 'opacity: 1; pointer-events: auto;';
    elements.drawer.style.cssText = 'transform: translateY(0); pointer-events: auto;';
    elements.drawer.setAttribute('aria-hidden', 'false');
    elements.hamburger?.setAttribute('aria-expanded', 'true');
    elements.hamburger?.classList.add('drawer-open');
  });

  const onTransitionEnd = (e) => {
    if (e.target !== elements.drawer || e.propertyName !== 'transform') return;
    elements.drawer.removeEventListener('transitionend', onTransitionEnd);
    state.isOpen = true;
    state.isAnimating = false;
    callback?.();
  };
  elements.drawer.addEventListener('transitionend', onTransitionEnd, { once: true });

  setTimeout(() => {
    if (state.isAnimating) {
      elements.drawer.removeEventListener('transitionend', onTransitionEnd);
      state.isOpen = true;
      state.isAnimating = false;
      callback?.();
    }
  }, CONFIG.timing + 50);
}

function closeDrawer(callback) {
  if (state.isAnimating || !state.isOpen || !elements.backdrop || !elements.drawer) {
    callback?.();
    return;
  }
  state.isAnimating = true;

  if (elements.drawer.contains(document.activeElement)) {
    document.activeElement.blur();
    elements.hamburger?.focus();
  }

  requestAnimationFrame(() => {
    elements.drawer.style.transform = 'translateY(100%)';
    elements.backdrop.style.opacity = '0';
  });

  const onTransitionEnd = (e) => {
    if (e.target !== elements.drawer || e.propertyName !== 'transform') return;
    elements.drawer.removeEventListener('transitionend', onTransitionEnd);
    finalizeClose(callback);
  };
  elements.drawer.addEventListener('transitionend', onTransitionEnd, { once: true });

  setTimeout(() => {
    if (state.isAnimating) {
      elements.drawer.removeEventListener('transitionend', onTransitionEnd);
      finalizeClose(callback);
    }
  }, CONFIG.timing + 50);
}

function finalizeClose(callback) {
  requestAnimationFrame(() => {
    elements.backdrop.style.cssText = 'opacity: 0; pointer-events: none;';
    elements.drawer.style.cssText = 'transform: translateY(100%); pointer-events: none;';
    document.body.style.overflow = '';
    elements.drawer.setAttribute('aria-hidden', 'true');
    elements.hamburger?.setAttribute('aria-expanded', 'false');
    elements.hamburger?.classList.remove('drawer-open');

    state.isOpen = false;
    state.isAnimating = false;
    callback?.();
  });
}

function toggleDrawer() {
  state.isOpen ? closeDrawer() : openDrawer();
}

/* ============================================
   CLEANUP
   ============================================ */

function cleanup() {
  document.body.style.overflow = '';

  if (boundDocumentClick) {
    document.removeEventListener('click', boundDocumentClick);
    boundDocumentClick = null;
  }
  if (boundDocumentKeydown) {
    document.removeEventListener('keydown', boundDocumentKeydown);
    boundDocumentKeydown = null;
  }

  state = { isOpen: false, isAnimating: false, activeAction: null, activeDropdown: null, currentPath: '/' };
  elements.actionElements.clear();
  elements.dropdownElements.clear();
  elements.cards = [];
  if (elements.container) elements.container.innerHTML = '';
  elements = { container: null, header: null, drawer: null, backdrop: null, hamburger: null, actionElements: new Map(), dropdownElements: new Map(), cards: [] };
  callbacks = { onNavigate: null, onSearch: null };
}

/* ============================================
   INITIALIZATION
   ============================================ */

function initHeader(options = {}) {
  const { container, onNavigate = null, onSearch = null } = options;

  if (!container) {
    console.error('initHeader: container element required');
    return () => {};
  }

  elements.container = container;
  callbacks.onNavigate = onNavigate;
  callbacks.onSearch = onSearch;
  state.currentPath = window.location.pathname;

  container.innerHTML = generateHeaderHTML();
  cacheElements();

  if (elements.drawer) {
    elements.drawer.innerHTML = generateDrawerHTML();
    elements.cards = elements.drawer.querySelectorAll('.nav-card');
    const actionCards = elements.drawer.querySelectorAll('[data-action-card]');
    actionCards.forEach((card) => {
      const id = card.dataset.actionCard;
      elements.actionElements.set(id, {
        card,
        inputSection: card.querySelector('.action-input-section'),
        chevron: card.querySelector('.action-chevron'),
        input: card.querySelector(`[data-action-input="${id}"]`),
        error: card.querySelector(`[data-action-error="${id}"]`),
        form: card.querySelector(`[data-action-form="${id}"]`),
      });
    });
  }

  bindEvents();
  return cleanup;
}

window.CompanyWiseHeader = { initHeader };

// Auto-init if container exists
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('header-container');
  if (container && !container.hasChildNodes()) {
    initHeader({ container });
  }

  // Mount credit badge in desktop nav
  const badgeContainer = document.getElementById('header-credit-badge');
  if (badgeContainer && window.CompanyWiseCreditBadge) {
    window.CompanyWiseCreditBadge.create(badgeContainer);
  }
});