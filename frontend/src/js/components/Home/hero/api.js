/* ============================================
   COMPANYWISE — hero/api.js
   Thin fetch wrapper for API endpoints
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
   * Search companies by name or number.
   * @param {string} query - Search term (min 1 char)
   * @param {number} [limit=20] - Max results (1-100)
   * @returns {Promise<Array<{company_number: string, name: string, jurisdiction: string|null}>>}
   */
  function searchCompanies(query, limit = 20) {
    return request(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
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

  window.CompanyWiseAPI = { searchCompanies, getCompany, getFilingFacts };
})();
