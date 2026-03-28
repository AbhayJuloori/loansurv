import bisect


def get_risk_percentile(default_prob_36m: float, sample: list[float]) -> int:
    """
    Return percentile rank (0-100) of default_prob_36m vs a reference sample.
    Higher = riskier.
    """
    if not sample:
        return 50
    sorted_sample = sorted(sample)
    pos = bisect.bisect_left(sorted_sample, default_prob_36m)
    return round(pos / len(sorted_sample) * 100)
