from fastapi import APIRouter

from app.core.config import get_settings
from app.legal.documents import (
    COOKIE_NOTICE_MARKDOWN,
    PRIVACY_POLICY_MARKDOWN,
    TERMS_OF_SERVICE_MARKDOWN,
)
from app.schemas.finalization import LegalDocumentResponse


router = APIRouter(prefix="/legal", tags=["legal"])
settings = get_settings()


@router.get("/privacy", response_model=LegalDocumentResponse)
async def privacy_notice() -> LegalDocumentResponse:
    return LegalDocumentResponse(
        document_type="privacy",
        version=settings.privacy_version,
        effective_date=settings.legal_effective_date,
        is_draft=settings.legal_documents_are_drafts,
        contact_email=settings.legal_contact_email,
        content_markdown=PRIVACY_POLICY_MARKDOWN,
    )


@router.get("/terms", response_model=LegalDocumentResponse)
async def terms_of_service() -> LegalDocumentResponse:
    return LegalDocumentResponse(
        document_type="terms",
        version=settings.terms_version,
        effective_date=settings.legal_effective_date,
        is_draft=settings.legal_documents_are_drafts,
        contact_email=settings.legal_contact_email,
        content_markdown=TERMS_OF_SERVICE_MARKDOWN,
    )


@router.get("/cookie-notice", response_model=LegalDocumentResponse)
async def cookie_notice() -> LegalDocumentResponse:
    return LegalDocumentResponse(
        document_type="cookie",
        version=settings.privacy_version,
        effective_date=settings.legal_effective_date,
        is_draft=settings.legal_documents_are_drafts,
        contact_email=settings.legal_contact_email,
        content_markdown=COOKIE_NOTICE_MARKDOWN,
    )