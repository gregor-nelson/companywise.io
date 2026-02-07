# Project Brief: Freelancer Client Vetting Tool (UK)

## Elevator Pitch

A simple, fast tool that answers one question for UK freelancers and contractors: **"Will this company pay my invoice?"**

Enter a company name or number, get a plain-English risk verdict (Low / Medium / High) with the top reasons why. No jargon, no bait-and-switch paywalls, no enterprise pricing.

Think "Credit Karma for freelancers checking UK clients."

---

## The Problem

UK freelancers routinely take on projects worth £1k–£20k+ without knowing if the client is financially stable. Existing options are either:

- **Enterprise tools** (Creditsafe, Experian, Red Flag Alert) — priced for finance teams, not solo freelancers
- **Vibe-coded junk** (Checkaco, etc.) — rank well on Google but deliver nothing useful. "Free credit check" means "paywall after you search." Garbage UI, no real value at the free tier
- **Companies House directly** — public data but terrible UX, no interpretation, requires financial literacy to make sense of filings

There is no "Monzo for company checks" — something simple, trustworthy, and built for normal people.

---

## The Product

### Free Tier (no account required for first check, 3 checks/month with account)

- Risk verdict: **Low / Medium / High**
- Top 3 red flags in plain English (e.g. "Accounts are 8 months overdue", "Director has 2 dissolved companies")
- Company age, size, status, last accounts date

### Paid: Credit Packs (no subscriptions, no auto-renew)

| Pack | Credits | Price per check |
|------|---------|----------------|
| Starter | 10 | £0.50 |
| Standard | 25 | £0.40 |
| Pro | 60 | £0.33 |

Credits never expire. One credit = one full company check.

### Why Credit Packs Over Subscriptions

Freelancers hate subscriptions. They might use the tool intensively for a week while onboarding clients, then not touch it for months. Credits align payment with actual use and eliminate "forgot to cancel" resentment.

---

## Target User

UK freelancers and contractors who invoice B2B clients £1k+ per project. Specifically:

- Developers, designers, copywriters, consultants
- People who've been burned by non-payment before
- Freelancers scaling up and taking on clients they can't personally vet through reputation

**The moment:** They've just received an enquiry or are about to send a quote. They want a quick sanity check before committing time and effort.

---

## Risk Scoring Logic (v1)

Build a simple weighted score from publicly available data. No ML needed initially.

### Red Flags (increase risk)

- Accounts overdue (and by how much)
- Confirmation statement overdue
- CCJs registered against the company
- Active charges/mortgages
- Director has multiple dissolved companies
- Company very young (< 2 years) with no filed accounts
- Frequent director changes
- Registered at a virtual office / formation agent address

### Green Flags (decrease risk)

- Accounts filed on time, consistently
- Company age > 5 years
- No CCJs or charges
- Stable directorship
- Higher reported turnover/assets (when available from parsed accounts)

### Output

A simple verdict with reasoning:

> **MEDIUM RISK**
> - Accounts are 6 months overdue
> - Director also directs 1 dissolved company (dissolved 2021)
> - Company has been trading for 4 years
>
> *Recommendation: Request upfront payment or milestone billing.*

---

## Data Sources

### Companies House Bulk Data (Primary — your own database)

**This is the key architectural decision.** Companies House provides free bulk downloads of the entire register.

- **URL:** https://download.companieshouse.gov.uk/en_output.html
- **Contents:** ~5 million companies, CSV format, ~400MB zipped / ~2GB unzipped
- **Updated:** Monthly (new snapshot within 5 working days of month end)
- **Includes:** Company name, number, status, type, registered address, SIC codes, incorporation date, last accounts date, next accounts due date, confirmation statement dates

**Also available:**

- **Accounts data (iXBRL/XML):** https://download.companieshouse.gov.uk/en_accountsdata.html — daily files (60-day retention) + monthly archives. Covers ~60% of accounts (electronically filed only since 2008)
- **PSC data (JSON):** Persons with significant control, updated daily
- **Officers data:** Available on request via developer forum (not publicly downloadable)

### Companies House API (Supplementary — real-time lookups)

- **URL:** https://developer.company-information.service.gov.uk/
- **Access:** Free. Register for account, generate API key, no approval process
- **Rate limit:** 600 requests per 5-minute window (fixed window, resets fully). Can burst 600 then wait. Can request higher limits.
- **Use for:** Officer details, filing history, document downloads, charge details — anything not in the bulk CSV or that needs to be real-time

### Architecture

1. Import monthly bulk CSV into yet to be confirmed maybe sql light  (~5M companies)
2. Daily/weekly sync job for changes (daily accounts files + API delta checks)
3. Serve all user queries from your own DB — no rate limit concerns
4. Hit API live only for data not yet cached (officer details, specific documents)

This is how enterprise competitors do it. Same data advantage, better UX.

---

## Competitive Landscape

### Not Real Competitors

- **Checkaco** — ranks well for "free company credit check UK" but delivers nothing. Paywall masquerading as a free tool. Terrible UI. Proof that SEO is achievable in this space with a garbage product.
- **Other per-report paywalls** — £5–10 per report, no relationship, no retention

### Actual Competitors (but not targeting freelancers)

- **Creditsafe, Experian, D&B** — enterprise pricing, built for credit managers and finance teams
- **Capitalise** — closest to consumer-friendly, but really a lending marketplace using credit checks as lead-gen
- **Endole** — subscription model, unlimited access, but UX aimed at businesses not individuals
- **Red Flag Alert** — UK-focused, AI-powered, but enterprise

### Your Edge

- **Free tier that actually delivers value** (competitors bait-and-switch)
- **Plain English, not credit scores** (interpretation, not raw data)
- **Built for freelancers, not finance teams** (UX, language, pricing)
- **No subscription** (credit packs, no auto-renew)

---

## Distribution / Growth

### Programmatic SEO

Auto-generate static HTML pages for every UK company answering "Is [Company Name] safe to work with?" Target:

- "[company name] reviews"
- "[company name] credit rating"
- "[company name] safe to work with"
- "[company name] financial health"

~5 million potential pages. No ads, no trackers. Optimise for both traditional SEO and LLM indexing.

### Freelancer Communities

- UK freelancer Slack groups, Discord servers
- ContractorUK forums
- Twitter/X freelancer communities
- Reddit (r/freelanceUK, r/contractoruk)

### Content / SEO (editorial)

- "Will my client pay me" — problem-aware searches
- "How to check if a client will pay"
- "Freelancer client red flags"
- "Vetting clients as a freelancer"

---

## Future Features (don't build until validated)

- **Company monitoring/alerts** — 1 credit/month to watch a client, get emailed if their status changes
- **Director network visualisation** — "This director connects to these 14 companies"
- **Community signal** — "47 freelancers checked this company in the past month" (anonymised)
- **Contract clause suggestions** — "Based on this risk profile, request 50% upfront"
- **Browser extension** — flags company risk when visiting their website
- **API access** — for agencies running bulk checks
- **"No-chase" guarantee rating** — branded risk tier system

---

## Working Name

Undecided. Candidates:

- **NoChase** — "check first, chase never." Works as a verb: "Have you NoChased them?"
- **WillTheyPay** — the exact question in the user's head
- **BeforeYouQuote** — the moment it's used
- **Day45** — inside-baseball for freelancers who've lived the overdue invoice anxiety

---

## Context: Parent Project

This tool is a side project to generate income while the founder builds **motorwise.io** — a UK vehicle intelligence platform using DVLA/DVSA data with ML-based fraud detection, MOT history, and ULEZ compliance. Longer development cycle, needs revenue from a faster-to-ship product.

**Founder strengths:** UK government data APIs (DVLA, DVSA, Companies House), data processing/cleaning, shipping functional products, presenting public data clearly.

---

## Tech Stack

- **Frontend:** JavaScript
- **Backend:** Python
- **Database:** yet to be confirmed maybe sql light 

## Tech Notes

- Companies House bulk CSV imports directly into yet to be confirmed maybe sql light 
- iXBRL accounts files need parsing for financial data extraction — defer to paid tier
- Officer bulk data requires contacting Companies House directly to obtain
- The Streaming API is also available for real-time change notifications (useful for monitoring feature later)
- All data is Crown Copyright but freely usable with no restrictions on commercial use

---

*Last updated: February 2026*
*Status: Pre-build. Direction validated. Ready for MVP development.*