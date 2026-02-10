# Changelog

## 2026-02-10 — Fix Date Normalization Edge Cases in bulk_loader.py

### Bug Fixes

**Soft hyphen (`\u00ad`) mishandled as invisible character**

- Removed `\u00ad` from `_INVISIBLE_CHARS_RE` regex so it is no longer silently stripped
- Added explicit replacement of `\u00ad` with `-` before invisible char removal
- Previously, dates like `28­02­2023` were concatenated into `28022023`, which no format could parse
- ~3 filings affected

**Missing `%d.%m.%Y` date format**

- Added `%d.%m.%Y` (dot-separated, 4-digit year) to the format list
- Previously, dates like `31.12.2024` failed to match `%d.%m.%y` (2-digit year only) and were stored unparsed
- ~5 filings affected

### File Modified

- `backend/loader/bulk_loader.py` (lines 63, 99, 108)
