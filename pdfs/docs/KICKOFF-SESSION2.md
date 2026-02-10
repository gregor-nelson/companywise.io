# Session 2: Fix PDF Pipeline Accuracy

The PDF parsing pipeline runs end-to-end but scores 0/10 against ground truth. Three issues to fix: a scale bug (values 1000x too large), 6 missing concepts (table detection or label matching), and slow classification (93s OCR on all 42 pages).

Start by reading the handover, then the spec, then discuss approach before writing code.

- Handover (problems, root causes, fix plan): `pdfs/docs/HANDOVER-SESSION2-ACCURACY.md`
- Pipeline spec (architecture, stage detail, data flow): `pdfs/spec/PDF-PARSING-PIPELINE.md`
- Ground truth and concept mapping: `pdfs/docs/HANDOVER-STAGE2-PARSING.md`
- Source code: `pdfs/parser/`
- CLI: `pdfs/scripts/parse_filing.py`
