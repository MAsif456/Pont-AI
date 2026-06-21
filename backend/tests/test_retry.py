"""Tests for the transient-error retry helper."""

import pytest

from core.retry import call_with_retry


def test_returns_value_on_success():
    assert call_with_retry(lambda: 7) == 7


def test_non_api_errors_propagate_immediately():
    calls = {"count": 0}

    def boom():
        calls["count"] += 1
        raise ValueError("not retryable")

    with pytest.raises(ValueError):
        call_with_retry(boom)
    # A non-API error must not be retried.
    assert calls["count"] == 1
