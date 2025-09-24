"""Microsoft Graph email sending utilities."""

from .config import GraphConfig, load_graph_config
from .exceptions import ConfigError, EmailSenderError, GraphSendError, TokenAcquisitionError
from .graph_client import GraphEmailClient, GraphSendResult
from .token_service import GraphTokenService

__all__ = [
    "GraphConfig",
    "GraphEmailClient",
    "GraphSendResult",
    "GraphTokenService",
    "ConfigError",
    "EmailSenderError",
    "GraphSendError",
    "TokenAcquisitionError",
    "load_graph_config",
]
