"""
Stage 8: Arithmetic validation — cross-check extracted values using
balance sheet equations.

Financial statements have built-in checksums. If these don't balance,
something was extracted incorrectly.
"""

from dataclasses import dataclass


@dataclass
class ValidationCheck:
    name: str
    equation: str         # human-readable description
    expected: int | None
    actual: int | None
    passed: bool | None   # None = skipped (missing values)
    difference: int | None


@dataclass
class ValidationResult:
    checks: list[ValidationCheck]

    @property
    def all_passed(self) -> bool:
        return all(c.passed is True for c in self.checks if c.passed is not None)

    @property
    def summary(self) -> str:
        ran = [c for c in self.checks if c.passed is not None]
        passed = [c for c in ran if c.passed]
        skipped = [c for c in self.checks if c.passed is None]
        return f"{len(passed)}/{len(ran)} passed, {len(skipped)} skipped"


def _get(facts: dict[str, int], key: str) -> int | None:
    return facts.get(key)


def validate(facts: dict[str, int], tolerance: int = 1) -> ValidationResult:
    """Run arithmetic cross-checks on a set of extracted financial facts.

    Args:
        facts: concept name → value (e.g. {"FixedAssets": 4308, ...})
        tolerance: allowed rounding difference (±)

    Returns:
        ValidationResult with individual check outcomes.
    """
    checks: list[ValidationCheck] = []

    # Check 1: CurrentAssets - Creditors == NetCurrentAssetsLiabilities
    ca = _get(facts, "CurrentAssets")
    cr = _get(facts, "Creditors")
    nca = _get(facts, "NetCurrentAssetsLiabilities")
    if ca is not None and cr is not None and nca is not None:
        expected = ca - cr
        diff = abs(expected - nca)
        checks.append(ValidationCheck(
            name="net_current",
            equation="CurrentAssets - Creditors = NetCurrentAssetsLiabilities",
            expected=expected,
            actual=nca,
            passed=diff <= tolerance,
            difference=expected - nca,
        ))
    else:
        checks.append(ValidationCheck(
            name="net_current",
            equation="CurrentAssets - Creditors = NetCurrentAssetsLiabilities",
            expected=None, actual=None, passed=None, difference=None,
        ))

    # Check 2: FixedAssets + NetCurrentAssetsLiabilities == TotalAssetsLessCurrentLiabilities
    fa = _get(facts, "FixedAssets")
    talcl = _get(facts, "TotalAssetsLessCurrentLiabilities")
    if fa is not None and nca is not None and talcl is not None:
        expected = fa + nca
        diff = abs(expected - talcl)
        checks.append(ValidationCheck(
            name="total_assets_less_cl",
            equation="FixedAssets + NetCurrentAssetsLiabilities = TotalAssetsLessCurrentLiabilities",
            expected=expected,
            actual=talcl,
            passed=diff <= tolerance,
            difference=expected - talcl,
        ))
    else:
        checks.append(ValidationCheck(
            name="total_assets_less_cl",
            equation="FixedAssets + NetCurrentAssetsLiabilities = TotalAssetsLessCurrentLiabilities",
            expected=None, actual=None, passed=None, difference=None,
        ))

    # Check 3: NetAssetsLiabilities == Equity
    na = _get(facts, "NetAssetsLiabilities")
    eq = _get(facts, "Equity")
    if na is not None and eq is not None:
        diff = abs(na - eq)
        checks.append(ValidationCheck(
            name="net_assets_eq_equity",
            equation="NetAssetsLiabilities = Equity",
            expected=na,
            actual=eq,
            passed=diff <= tolerance,
            difference=na - eq,
        ))
    else:
        checks.append(ValidationCheck(
            name="net_assets_eq_equity",
            equation="NetAssetsLiabilities = Equity",
            expected=None, actual=None, passed=None, difference=None,
        ))

    return ValidationResult(checks=checks)
