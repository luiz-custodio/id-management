"""Access token management for Microsoft Graph."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Optional

import httpx

from .config import GraphConfig
from .exceptions import TokenAcquisitionError


class GraphTokenService:
    """Simple cached token provider for client credentials flow."""

    def __init__(self, config: GraphConfig) -> None:
        self._config = config
        self._access_token: Optional[str] = None
        self._expires_at: datetime = datetime.min.replace(tzinfo=timezone.utc)
        self._lock = Lock()

    def get_access_token(self) -> str:
        """Return a valid access token, refreshing it if necessary."""

        now = datetime.now(timezone.utc)
        with self._lock:
            if self._access_token and now < self._expires_at:
                return self._access_token

            token, expires_in = self._request_new_token()
            buffer_seconds = 30
            try:
                expires = int(expires_in)
            except (TypeError, ValueError):
                expires = 3600
            self._access_token = token
            self._expires_at = now + timedelta(seconds=max(0, expires - buffer_seconds))
            return self._access_token

    def _request_new_token(self) -> tuple[str, int]:
        url = f"https://login.microsoftonline.com/{self._config.tenant_id}/oauth2/v2.0/token"
        data = {
            "client_id": self._config.client_id,
            "client_secret": self._config.client_secret.get_secret_value(),
            "scope": self._config.scope,
            "grant_type": "client_credentials",
        }
        try:
            response = httpx.post(url, data=data, timeout=30)
        except httpx.HTTPError as exc:
            raise TokenAcquisitionError(f"Falha ao obter token do Azure AD: {exc}") from exc

        if response.status_code != 200:
            text = response.text
            raise TokenAcquisitionError(
                f"Azure AD retornou status {response.status_code} ao obter token: {text}"
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise TokenAcquisitionError("Resposta invalida ao obter token (JSON invalido)") from exc

        token = payload.get("access_token")
        expires_in = payload.get("expires_in", 3600)
        if not token:
            raise TokenAcquisitionError("Resposta do Azure AD nao contem access_token")

        return token, expires_in
