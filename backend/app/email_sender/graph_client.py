"""Email sending client using Microsoft Graph."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Optional, Sequence, Any
from urllib.parse import quote

import httpx
import re

from .config import GraphConfig
from .exceptions import GraphSendError
from .token_service import GraphTokenService


@dataclass
class GraphSendResult:
    """Simple result envelope for sendMail calls."""

    success: bool
    request_id: str | None = None


EMAIL_PATTERN = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)


def _dedupe_emails(addresses: Iterable[str]) -> List[str]:
    seen: set[str] = set()
    result: List[str] = []
    for addr in addresses:
        normalized = (addr or '').strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(normalized)
    return result


def _extract_emails_from_text(value: Any) -> List[str]:
    if not isinstance(value, str):
        return []
    return [match.group(0) for match in EMAIL_PATTERN.finditer(value)]


class GraphEmailClient:
    """Wrapper that sends HTML emails through Microsoft Graph."""

    def __init__(self, config: GraphConfig, token_service: GraphTokenService) -> None:
        self._config = config
        self._token_service = token_service
        self._client = httpx.Client(base_url="https://graph.microsoft.com/v1.0", timeout=30)

    def close(self) -> None:
        self._client.close()

    def _format_recipients(self, addresses: Sequence[str]) -> List[dict[str, dict[str, str]]]:
        unique: list[str] = []
        seen = set()
        for addr in addresses:
            normalized = addr.strip()
            if not normalized:
                continue
            lower = normalized.lower()
            if lower in seen:
                continue
            seen.add(lower)
            unique.append(normalized)
        if not unique:
            raise GraphSendError("Nenhum destinatario valido informado")
        return [{"emailAddress": {"address": addr}} for addr in unique]

    def send_html_message(
        self,
        *,
        to: Iterable[str],
        subject: str,
        html_body: str,
        sender: Optional[str] = None,
        save_to_sent_items: bool = True,
    ) -> GraphSendResult:
        recipients = self._format_recipients(list(to))
        request_payload = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "HTML",
                    "content": html_body,
                },
                "toRecipients": recipients,
            },
            "saveToSentItems": bool(save_to_sent_items),
        }

        access_token = self._token_service.get_access_token()
        auth_header = {"Authorization": f"Bearer {access_token}"}

        default_sender = str(self._config.default_sender).strip()
        if not default_sender:
            raise GraphSendError("Remetente padrao nao configurado")

        sender_address = sender.strip() if sender else default_sender
        if not sender_address:
            raise GraphSendError("Remetente nao configurado")

        if sender_address.lower() != default_sender.lower():
            request_payload["message"]["from"] = {"emailAddress": {"address": sender_address}}
            request_payload["message"]["sender"] = {"emailAddress": {"address": sender_address}}

        sender_path = quote(default_sender)
        url = f"/users/{sender_path}/sendMail"

        try:
            response = self._client.post(url, json=request_payload, headers=auth_header)
        except httpx.HTTPError as exc:
            raise GraphSendError(f"Falha ao chamar Microsoft Graph: {exc}") from exc

        if response.status_code not in (202, 200):
            raw_text = response.text
            graph_code: str | None = None
            graph_message: str | None = None
            invalid_candidates: List[str] = []
            try:
                error_payload: Any = response.json()
            except ValueError:
                error_payload = None
            if isinstance(error_payload, dict):
                error_section = error_payload.get("error")
                if isinstance(error_section, dict):
                    graph_code = error_section.get("code")
                    graph_message = error_section.get("message") or graph_message
                    details = error_section.get("details")
                    if isinstance(details, list):
                        for detail in details:
                            if not isinstance(detail, dict):
                                continue
                            invalid_candidates.extend(_extract_emails_from_text(detail.get("message")))
                            invalid_candidates.extend(_extract_emails_from_text(detail.get("value")))
                    inner_error = error_section.get("innerError")
                    if isinstance(inner_error, dict):
                        for value in inner_error.values():
                            invalid_candidates.extend(_extract_emails_from_text(value))
                elif "message" in error_payload:
                    graph_message = str(error_payload.get("message"))
            request_id = response.headers.get("request-id") or response.headers.get("x-ms-ags-diagnostic")
            message_parts = [
                f"Microsoft Graph retornou status {response.status_code} ao enviar e-mail"
            ]
            if graph_code:
                message_parts.append(f"(codigo {graph_code})")
            detail_message = graph_message or raw_text or ""
            if detail_message:
                message_parts.append(": ")
                message_parts.append(detail_message)
                invalid_candidates.extend(_extract_emails_from_text(detail_message))
            if request_id:
                message_parts.append(f" [request-id: {request_id}]")
            if response.status_code == 404:
                message_parts.append(
                    f" Remetente '{default_sender}' nao encontrado. Verifique se GRAPH_DEFAULT_SENDER corresponde a uma caixa de correio existente e habilitada para envio, e se o aplicativo possui permissao de 'Send as'."
                )
            raise GraphSendError("".join(message_parts), invalid_recipients=_dedupe_emails(invalid_candidates))

        return GraphSendResult(
            success=True,
            request_id=response.headers.get("request-id")
            or response.headers.get("x-ms-ags-diagnostic"),
        )

    def __enter__(self) -> "GraphEmailClient":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()








