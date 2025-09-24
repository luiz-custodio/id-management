"""Custom exceptions for the email sender module."""

from __future__ import annotations

from typing import List, Optional

class EmailSenderError(RuntimeError):
    """Base class for email sender related errors."""


class ConfigError(EmailSenderError):
    """Raised when email sender configuration is invalid or missing."""


class TokenAcquisitionError(EmailSenderError):
    """Raised when acquiring an OAuth access token fails."""


class GraphSendError(EmailSenderError):
    """Raised when the Microsoft Graph sendMail call fails."""

    def __init__(self, message: str, *, invalid_recipients: Optional[List[str]] | None = None) -> None:
        super().__init__(message)
        self.invalid_recipients = [item for item in (invalid_recipients or []) if item]
