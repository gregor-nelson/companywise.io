/* ============================================
   COMPANYWISE — modal/api.js
   Thin fetch wrapper for modal API endpoints
   Same pattern as hero/api.js, own global
   ============================================ */

(function () {
  'use strict';

  const BASE_URL = '/api';

  async function request(path) {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      const err = new Error(detail);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  /**
   * Get company profile and filings.
   * @param {string} number - Companies House registration number
   * @returns {Promise<{company: Object, filings: Array}>}
   */
  function getCompany(number) {
    return request(`/company/${encodeURIComponent(number)}`);
  }

  /**
   * Get full filing with all facts.
   * @param {number} filingId - Database filing ID
   * @returns {Promise<Object>}
   */
  function getFilingFacts(filingId) {
    return request(`/filing/${filingId}/facts`);
  }

  window.CompanyWiseModalAPI = { getCompany, getFilingFacts };
})();
