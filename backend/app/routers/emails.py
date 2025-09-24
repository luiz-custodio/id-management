"""Routes responsible for listing companies emails and sending messages."""

from __future__ import annotations

import os
from typing import Iterable, List, Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import SessionLocal
from ..email_sender import (
    EmailSenderError,
    GraphEmailClient,
    GraphTokenService,
    GraphConfig,
    GraphSendError,
    load_graph_config,
)
from ..excel_sync import EmpresaEmailRecord, ExcelSyncError, ExcelSyncLockedError, fetch_empresas_emails

router = APIRouter(prefix="/emails", tags=["emails"])

MAX_RECIPIENTS_PER_BATCH = 20


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _dedupe_preserve_order(items: Iterable[str]) -> List[str]:
    seen = set()
    result: List[str] = []
    for item in items:
        lowered = item.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        result.append(item)
    return result


def _parse_allowed_senders(config: GraphConfig) -> List[str]:
    raw = os.getenv('GRAPH_ALLOWED_SENDERS', '')
    adapter = TypeAdapter(EmailStr)
    allowed: List[str] = []
    seen = set()
    for part in raw.split(','):
        candidate = part.strip()
        if not candidate:
            continue
        try:
            email = adapter.validate_python(candidate)
        except ValidationError:
            continue
        lower = email.lower()
        if lower in seen:
            continue
        seen.add(lower)
        allowed.append(email)
    default_sender = str(config.default_sender)
    if default_sender and default_sender.lower() not in seen:
        allowed.append(default_sender)
    return allowed


def _collect_emails_for_empresas(
    empresas: Sequence[models.Empresa],
    registros: dict[str, EmpresaEmailRecord],
) -> tuple[List[str], List[schemas.EmpresaEmailOut]]:
    recipients: List[str] = []
    missing: List[schemas.EmpresaEmailOut] = []

    for emp in empresas:
        registro = registros.get(emp.id_empresa)
        if not registro or not registro.emails:
            missing.append(
                schemas.EmpresaEmailOut(
                    empresa_id=emp.id,
                    id_empresa=emp.id_empresa,
                    nome=emp.nome,
                    emails=[],
                    excel_rows=registro.excel_rows if registro else [],
                )
            )
            continue
        recipients.extend(registro.emails)

    return recipients, missing

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/empresas", response_model=List[schemas.EmpresaEmailOut])
def listar_empresas_emails(db: Session = Depends(get_db)):
    """Return all companies along with e-mails sourced from the Excel sheet."""

    try:
        registros = fetch_empresas_emails()
    except ExcelSyncLockedError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ExcelSyncError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    stmt = select(models.Empresa).order_by(models.Empresa.nome.asc())
    empresas = db.execute(stmt).scalars().all()

    response: List[schemas.EmpresaEmailOut] = []
    for emp in empresas:
        registro = registros.get(emp.id_empresa)
        response.append(
            schemas.EmpresaEmailOut(
                empresa_id=emp.id,
                id_empresa=emp.id_empresa,
                nome=emp.nome,
                emails=registro.emails if registro else [],
                excel_rows=registro.excel_rows if registro else [],
            )
        )
    return response


@router.get("/config", response_model=schemas.EmailConfigResponse)
def obter_config_email():
    try:
        config = load_graph_config()
    except ConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    allowed = _parse_allowed_senders(config)
    return schemas.EmailConfigResponse(
        default_sender=config.default_sender,
        allowed_senders=allowed,
    )


@router.post("/send", response_model=schemas.EmailSendResponse)
def enviar_email(request: schemas.EmailSendRequest, db: Session = Depends(get_db)):
    if not request.empresa_ids:
        raise HTTPException(status_code=400, detail="Selecione pelo menos uma empresa")

    stmt = select(models.Empresa).where(models.Empresa.id.in_(request.empresa_ids))
    empresas = db.execute(stmt).scalars().all()

    if not empresas:
        raise HTTPException(status_code=404, detail="Empresas nao encontradas")

    empresas_map = {emp.id: emp for emp in empresas}
    not_found = [emp_id for emp_id in request.empresa_ids if emp_id not in empresas_map]
    if not_found:
        raise HTTPException(status_code=404, detail=f"Empresas nao encontradas: {not_found}")

    try:
        registros = fetch_empresas_emails()
    except ExcelSyncLockedError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ExcelSyncError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    recipients, missing = _collect_emails_for_empresas(empresas, registros)

    if request.override_recipients:
        manual = [str(email).strip() for email in request.override_recipients]
        manual = [email for email in manual if email]
        recipients = manual
        missing = []

    recipients = _dedupe_preserve_order(recipients)

    if not recipients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum e-mail encontrado para as empresas selecionadas",
        )

    try:
        config = load_graph_config()
    except ConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    allowed_senders = _parse_allowed_senders(config)

    selected_sender = request.sender_email or str(config.default_sender)
    if not selected_sender:
        raise HTTPException(status_code=400, detail="Remetente nao configurado")

    allowed_lookup = {item.lower() for item in allowed_senders}
    if selected_sender.lower() not in allowed_lookup:
        raise HTTPException(status_code=400, detail="Remetente nao permitido")

    token_service = GraphTokenService(config)

    canonical_lookup = {email.lower(): email for email in recipients}
    failed_lower: set[str] = set()
    extra_failed: list[str] = []
    extra_seen: set[str] = set()
    pending = recipients.copy()
    request_ids: list[str] = []

    def record_failed(addresses: Iterable[str]) -> None:
        for address in addresses:
            cleaned = (address or "").strip()
            if not cleaned:
                continue
            key = cleaned.lower()
            if key in canonical_lookup:
                failed_lower.add(key)
            elif key not in extra_seen:
                extra_seen.add(key)
                extra_failed.append(cleaned)

    try:
        with GraphEmailClient(config, token_service) as client:
            while pending:
                batch = pending[:MAX_RECIPIENTS_PER_BATCH]
                pending = pending[MAX_RECIPIENTS_PER_BATCH:]
                if not batch:
                    continue
                try:
                    result = client.send_html_message(
                        to=batch,
                        subject=request.subject.strip(),
                        html_body=request.body_html,
                        save_to_sent_items=request.save_to_sent_items,
                        sender=selected_sender,
                    )
                except GraphSendError as exc:
                    invalid = _dedupe_preserve_order(getattr(exc, "invalid_recipients", []))
                    if invalid:
                        record_failed(invalid)
                        filtered_batch = [email for email in batch if email.lower() not in failed_lower]
                        if filtered_batch == batch:
                            raise
                        pending = [email for email in pending if email.lower() not in failed_lower]
                        if filtered_batch:
                            pending = filtered_batch + pending
                        continue
                    raise
                except EmailSenderError:
                    raise
                if result.request_id:
                    request_ids.append(result.request_id)
    except GraphSendError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except EmailSenderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    successful_recipients = [email for email in recipients if email.lower() not in failed_lower]
    failed_recipients = [email for email in recipients if email.lower() in failed_lower]
    failed_recipients.extend(extra_failed)
    failed_recipients = _dedupe_preserve_order(failed_recipients)
    dedup_request_ids = _dedupe_preserve_order([rid for rid in request_ids if rid])
    combined_request_id = ",".join(dedup_request_ids) if dedup_request_ids else None

    return schemas.EmailSendResponse(
        sent=bool(successful_recipients),
        recipients=successful_recipients,
        missing=missing,
        request_id=combined_request_id,
        sender=selected_sender,
        failed_recipients=failed_recipients,
    )
