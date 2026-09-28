"""Shared error types mapped to the `502` error-body shapes in contracts/api-contracts.md."""


class UpstreamServiceError(Exception):
    """Raised when Hindsight, the LLM provider, or another external dependency fails.

    FR-022: the system must inform the user memory could not be stored/retrieved,
    without crashing or silently returning fabricated results.
    """

    def __init__(self, error_code: str, message: str):
        self.error_code = error_code
        self.message = message
        super().__init__(message)


class InvalidMeetingInputError(Exception):
    """Raised for empty/whitespace-only or malformed meeting input (FR-021)."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)
