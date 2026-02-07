/* ============================================
   COMPANYWISE — footer.js
   Reusable footer component (adapted from Motorwise)

   Usage:
   initFooter({ container }) - Initialize footer in the given container
   ============================================ */

function generateFooterHTML() {
  const year = new Date().getFullYear();

  return `
    <footer class="cw-footer min-h-[50vh] md:min-h-[60vh] py-16 md:py-18 relative overflow-hidden">
      <!-- SVG Filter for rounded clip-path corners -->
      <svg width="0" height="0" style="position: absolute;">
        <defs>
          <filter id="footer-chevron-rounding">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
          </filter>
        </defs>
      </svg>

      <!-- Mobile: Subtle upward-pointing chevron at top -->
      <div class="absolute top-0 left-0 w-full pointer-events-none z-0 md:hidden">
        <div
          class="w-full h-16 bg-gradient-to-br from-blue-50 to-blue-100/50 opacity-60"
          style="clip-path: polygon(0% 100%, 50% 0%, 100% 100%); filter: url(#footer-chevron-rounding);"
        ></div>
      </div>

      <!-- Desktop: Full-width chevrons pointing left (mirrored from hero) -->
      <div
        class="absolute top-0 left-0 w-full h-full hidden md:flex flex-row-reverse items-stretch pointer-events-none -z-10 p-4 gap-3"
        style="filter: url(#footer-chevron-rounding);"
      >
        <div
          class="shrink-0 grow-0 bg-gradient-to-br from-blue-50 to-blue-100/50"
          style="width: 55vw; height: max(60vh, 500px); border-radius: 0 24px 24px 0; clip-path: polygon(100% 0%, 80px 0%, 0% 50%, 80px 100%, 100% 100%);"
        ></div>
        <div
          class="shrink-0 grow-0 bg-gradient-to-br from-blue-50 to-blue-100/50"
          style="width: 18vw; height: max(60vh, 500px); clip-path: polygon(100% 0%, 80px 0%, 0% 50%, 80px 100%, 100% 100%);"
        ></div>
        <div
          class="shrink-0 grow-0 bg-gradient-to-br from-blue-50 to-blue-100/50"
          style="width: 12vw; height: max(60vh, 500px); clip-path: polygon(100% 0%, 60px 0%, 0% 50%, 60px 100%, 100% 100%);"
        ></div>
      </div>

      <!-- Blur accent -->
      <div
        class="absolute -bottom-8 -left-8 w-40 h-40 rounded-full blur-3xl pointer-events-none z-0 opacity-15"
        style="background: linear-gradient(135deg, #2563eb30, #05966920);"
      ></div>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div class="rounded-2xl bg-white px-6 md:px-10 lg:px-12 py-8 md:py-12 lg:py-14">

          <!-- Grid Layout -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 lg:gap-12 mb-6 md:mb-8">

            <!-- Column 1: Brand -->
            <div class="mb-4 md:mb-0">
              <a href="/" class="flex flex-col justify-center transition-transform duration-200 hover:scale-105 rounded inline-block">
                <span class="text-xl font-medium text-neutral-900 leading-tight tracking-tight">
                  company<span class="text-blue-600 relative inline-block">w<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80"></span></span>ise
                </span>
                <span class="text-xs text-neutral-600 mt-0.5">Check first. Invoice with confidence</span>
              </a>
              <p class="text-xs text-neutral-500 mt-4 leading-relaxed max-w-xs">
                Free company credit checks for UK freelancers. Plain-English risk verdicts from Companies House data.
              </p>
            </div>

            <!-- Column 2: Navigation -->
            <nav>
              <h3 class="text-xs font-medium text-neutral-900 uppercase tracking-wider mb-3 md:mb-4">
                Navigation
              </h3>
              <ul class="space-y-3 list-none m-0 p-0">
                <li><a href="#how-it-works" data-footer-link class="text-sm font-medium text-neutral-700 hover:text-blue-600 transition-colors">How it works</a></li>
                <li><a href="#what-we-check" data-footer-link class="text-sm font-medium text-neutral-700 hover:text-blue-600 transition-colors">What we check</a></li>
                <li><a href="#pricing" data-footer-link class="text-sm font-medium text-neutral-700 hover:text-blue-600 transition-colors">Pricing</a></li>
                <li><a href="#faq" data-footer-link class="text-sm font-medium text-neutral-700 hover:text-blue-600 transition-colors">FAQ</a></li>
              </ul>
            </nav>

            <!-- Column 3: Legal -->
            <nav>
              <h3 class="text-xs font-medium text-neutral-900 uppercase tracking-wider mb-3 md:mb-4">
                Legal
              </h3>
              <ul class="space-y-3 list-none m-0 p-0">
                <li><a href="/privacy" class="text-sm font-medium text-neutral-700 hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" class="text-sm font-medium text-neutral-700 hover:text-blue-600 transition-colors">Terms &amp; Conditions</a></li>
                <li><a href="/cookies" class="text-sm font-medium text-neutral-700 hover:text-blue-600 transition-colors">Cookie Policy</a></li>
                <li><a href="/contact" class="text-sm font-medium text-neutral-700 hover:text-blue-600 transition-colors">Contact</a></li>
              </ul>
            </nav>
          </div>

          <!-- Attribution Section -->
          <div class="border-t border-neutral-200 pt-6 md:pt-8">
            <div class="space-y-3 md:space-y-4">
              <p class="text-xs text-neutral-600 leading-relaxed">
                Company data provided by
                <a href="https://www.gov.uk/government/organisations/companies-house" class="text-blue-600 hover:text-blue-700 transition-colors underline underline-offset-2" target="_blank" rel="noopener noreferrer">Companies House</a>
              </p>
              <p class="text-xs text-neutral-600 leading-relaxed">
                All content is available under the
                <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" class="text-blue-600 hover:text-blue-700 transition-colors underline underline-offset-2" target="_blank" rel="noopener noreferrer">Open Government Licence v3.0</a>, except where otherwise stated. Crown Copyright.
              </p>
              <p class="text-xs text-neutral-500 font-medium">
                &copy; ${year} CompanyWise
              </p>
            </div>
          </div>

        </div>
      </div>
    </footer>
  `;
}

function initFooter(options = {}) {
  const { container } = options;

  if (!container) {
    console.error('initFooter: container element required');
    return;
  }

  container.innerHTML = generateFooterHTML();

  // Smooth scroll for anchor links
  container.querySelectorAll('[data-footer-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

window.CompanyWiseFooter = { initFooter };

// Auto-init if container exists
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('footer-container');
  if (container && !container.hasChildNodes()) {
    initFooter({ container });
  }
});