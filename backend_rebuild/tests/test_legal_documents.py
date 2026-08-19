from app.legal.documents import (
    COOKIE_NOTICE_MARKDOWN,
    PRIVACY_POLICY_MARKDOWN,
    TERMS_OF_SERVICE_MARKDOWN,
)


def test_legal_document_templates_are_present() -> None:
    assert "Privacy Notice" in PRIVACY_POLICY_MARKDOWN
    assert "Terms of Service" in TERMS_OF_SERVICE_MARKDOWN
    assert "Cookie Notice" in COOKIE_NOTICE_MARKDOWN