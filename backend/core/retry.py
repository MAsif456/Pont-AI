"""Retry helper for transient Gemini API failures.

The agent makes several sequential model calls, so a single transient error
(rate limit, or the model being temporarily overloaded) would otherwise fail the
whole referral. This retries those specific, retryable status codes with
exponential backoff; non-transient errors (bad request, auth) are raised at once.
"""

import time
from collections.abc import Callable
from typing import TypeVar

from google.genai import errors

T = TypeVar("T")

# Rate limiting and server-side overload/unavailability are worth retrying.
_TRANSIENT_STATUS = {429, 500, 502, 503, 504}


def call_with_retry(
    func: Callable[[], T], attempts: int = 4, base_delay: float = 1.0
) -> T:
    """Call ``func``, retrying transient API errors with exponential backoff."""
    last_error: errors.APIError | None = None
    for attempt in range(attempts):
        try:
            return func()
        except errors.APIError as error:
            if getattr(error, "code", None) not in _TRANSIENT_STATUS:
                raise
            last_error = error
            if attempt < attempts - 1:
                time.sleep(base_delay * (2**attempt))
    # Exhausted retries: re-raise the last transient error for the caller to map.
    raise last_error  # type: ignore[misc]
