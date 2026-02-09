# Premium Report — API Integration Handover

## What Was Done

The "Premium Report" button on the hero results card (`frontend/src/js/components/Home/hero/hero.js:584-594`) was rewired. Previously it just scrolled to the pricing section. Now it:
- Navigates to the premium report page if the user has wallet access or credits
- Opens the purchase dialog with `returnTo` context if the user has no credits

### Issue 1: Script/CSS Paths — COMPLETED

All script and CSS paths in `frontend/src/pages/Report/Premium/premium-report.html` have been fixed:
- Mock data path corrected to `Report/mock/mock-data.js`
- Header typo fixed (`cheader` → `header`)
- All payment flow components updated with `Handlers/` prefix (credit-wallet, purchase-dialog, credit-badge, upgrade-prompt, account-modal)
- Premium report script updated with `Report/` prefix
- `api.js` script tag added (was missing entirely)
- CSS `<link>` tags for header/footer were already correct (had `Global/` prefix)

## What Remains

The premium report page (`premium-report.html` + `premium-report.js`) cannot render real companies. It only works with hardcoded mock data. When a user clicks through from the hero with `?company=07081047`, nothing useful happens.

### Issue 2: getCompanyFromContext() Only Uses Mock Data

**File:** `frontend/src/js/components/Report/premium-report/premium-report.js` (lines 100-116)

```js
getCompanyFromContext() {
  const params = new URLSearchParams(window.location.search);
  const companyNumber = params.get('company');
  if (window.CompanyWiseMockData) {
    if (companyNumber) {
      return window.CompanyWiseMockData.findCompany(companyNumber);
    }
    return window.CompanyWiseMockData.companies.find(c => c.financials) ||
           window.CompanyWiseMockData.companies[0];
  }
  return null;
}
```

This needs to become async and fetch from the API when the company isn't in mock data:
1. Read `?company=` from URL
2. Try mock data first (dev convenience)
3. If not found, call `CompanyWiseAPI.getCompany(companyNumber)` then `CompanyWiseAPI.getFilingFacts(filingId)` to get full data
4. Transform the API response into the shape the report renderer expects

### Issue 3: Data Shape Mismatch

The premium report renderer (`render()`, `renderHeader()`, `renderOverview()`, etc.) expects the **mock data shape**:

```
{ name, number, type, status, risk, flags[], incorporated, address, sicCode,
  lastAccounts, nextAccountsDue, confirmationDue, recommendation,
  detailedRecommendation, directors[], charges[],
  financials: { turnover: {current, previous}, grossProfit: ..., netAssets: ...,
                cash, debtors, stocks, currentAssets, currentLiabilities } }
```

The API returns a different shape: `{ company: { company_number, name, jurisdiction }, filings: [...] }` plus filing facts as raw XBRL concepts.

The existing **transformer** (`frontend/src/js/components/Handlers/modal/transformer.js`) maps API data for the free report modal — but outputs a different shape than what the premium report needs. The premium report will need its own transform function (or the transformer extended) to produce the mock-compatible shape from API data.

### Issue 4: Wallet Uses `this.company.number` but API Uses `company_number`

In `premium-report.js` line 43: `const companyNumber = this.company.number;`

Mock data uses `.number`. API data uses `.company_number`. Whichever transform is built needs to normalise this to `.number` so the wallet access checks work.

## Key Files

| Purpose | Path |
|---------|------|
| Hero button (already fixed) | `frontend/src/js/components/Home/hero/hero.js` |
| Premium report HTML | `frontend/src/pages/Report/Premium/premium-report.html` |
| Premium report JS | `frontend/src/js/components/Report/premium-report/premium-report.js` |
| API module | `frontend/src/js/components/Home/hero/api.js` |
| Modal API (duplicate) | `frontend/src/js/components/Handlers/modal/api.js` |
| Transformer (free report) | `frontend/src/js/components/Handlers/modal/transformer.js` |
| Mock data | `frontend/src/js/components/Report/mock/mock-data.js` |
| Credit wallet | `frontend/src/js/components/Handlers/credit-wallet/credit-wallet.js` |
| Purchase dialog | `frontend/src/js/components/Handlers/purchase-dialog/purchase-dialog.js` |
| Home page (reference for correct paths) | `frontend/src/pages/Home/home.html` |

## How the Wallet Auth Flow Works (Already Built)

The credit wallet uses a Lamport hash-chain stored in localStorage (`companywise_wallet`):
- `CompanyWiseWallet.hasAccess(companyNumber)` — checks if company already unlocked (in `spentOn` array)
- `CompanyWiseWallet.getBalance()` — returns remaining credits
- `CompanyWiseWallet.spendCredit(companyNumber)` — verifies hash chain integrity, moves anchor down, decrements `remaining`, logs in `spentOn`, dispatches `creditWalletChanged` event
- The premium report's `init()` already calls these in the right order (lines 42-64) — the problem is purely that `getCompanyFromContext()` returns null for real companies

## Suggested Implementation Order

1. ~~Fix all script/CSS paths in `premium-report.html`~~ — DONE
2. ~~Add `hero/api.js` script tag to the page~~ — DONE
3. Make `init()` async — show a loading skeleton while fetching
4. Build a transform step (new function or extend transformer) that maps API response → mock-compatible shape for the renderer
5. Update `getCompanyFromContext()` to try mock data, then fall back to API fetch + transform
6. Ensure `.number` is normalised so wallet checks work
