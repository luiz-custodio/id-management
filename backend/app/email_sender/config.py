"""Configuration helpers for Microsoft Graph email sending."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

from pydantic import EmailStr, SecretStr, TypeAdapter, ValidationError

from .exceptions import ConfigError

DEFAULT_SCOPE = "https://graph.microsoft.com/.default"


@dataclass
class GraphConfig:
    """Container with credentials and defaults for Microsoft Graph."""

    tenant_id: str
    client_id: str
    client_secret: SecretStr
    default_sender: EmailStr
    scope: str = DEFAULT_SCOPE
    test_recipient: Optional[EmailStr] = None


_ENV_MAP = {
    "tenant_id": "TENANT_ID",
    "client_id": "CLIENT_ID",
    "client_secret": "CLIENT_SECRET",
    "default_sender": "GRAPH_DEFAULT_SENDER",
    "scope": "GRAPH_SCOPE",
    "test_recipient": "EMAIL_TEST",
}


def _read_env(name: str) -> Optional[str]:
    value = os.getenv(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def load_graph_config(*, raise_on_missing: bool = True) -> GraphConfig:
    """Load a GraphConfig from environment variables.

    Parameters
    ----------
    raise_on_missing:
        If True, raises ConfigError when required variables are absent.

    Returns
    -------
    GraphConfig
        The populated configuration object.
    """

    data: dict[str, Optional[str]] = {key: _read_env(env) for key, env in _ENV_MAP.items()}

    missing = [env for key, env in _ENV_MAP.items()
               if key in ("tenant_id", "client_id", "client_secret", "default_sender")
               and not data[key]]
    if missing and raise_on_missing:
        raise ConfigError(
            "Variaveis obrigatorias ausentes para envio de e-mail: " + ", ".join(missing)
        )

    email_adapter = TypeAdapter(EmailStr)

    try:
        tenant_id = (data["tenant_id"] or "").strip()
        client_id = (data["client_id"] or "").strip()
        client_secret = SecretStr(data["client_secret"] or "")
        default_sender = email_adapter.validate_python(data["default_sender"] or "")
    except ValidationError as exc:
        raise ConfigError(f"Configuracao invalida para envio de e-mail: {exc}") from exc

    scope = data.get("scope") or DEFAULT_SCOPE

    test_recipient = None
    if data.get("test_recipient"):
        try:
            test_recipient = email_adapter.validate_python(data["test_recipient"])
        except ValidationError as exc:
            raise ConfigError(f"EMAIL_TEST invalido: {exc}") from exc

    return GraphConfig(
        tenant_id=tenant_id,
        client_id=client_id,
        client_secret=client_secret,
        default_sender=default_sender,
        scope=scope,
        test_recipient=test_recipient,
    )

