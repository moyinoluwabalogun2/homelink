from app.core.config import get_settings


settings = get_settings()


PRIVACY_POLICY_MARKDOWN = f"""
# HomeLink Privacy Notice

**Effective date:** {settings.legal_effective_date}

This notice explains how {settings.company_legal_name} processes personal data when
people register, post listings, contact listing owners, apply as agents or landlords,
make payments, report content, or otherwise use HomeLink.

## Information we process

We may process account details, contact details, listing information, uploaded media,
agent-verification documents, inquiries, payment references and statuses, security
logs, device or browser information, and records of consent or acceptance.

## Why we process it

We process information to create and secure accounts, provide marketplace and property
services, verify agents and landlords, moderate content, process payments, prevent
fraud, respond to requests, comply with legal obligations, and improve service safety.

## Sharing and processors

We may use service providers for hosting, databases, email, media storage and payment
processing. Current or planned providers may include Cloudinary and Paystack. We only
share information needed for the relevant service and should maintain appropriate
processor terms and security controls.

## Retention

We retain personal data only for as long as necessary for the stated purposes, security,
dispute handling, accounting, fraud prevention, and legal obligations. Account deletion
anonymizes core profile information, while limited transaction or audit records may be
retained where legally required.

## Your choices and rights

Depending on applicable law, you may request access, correction, deletion, restriction,
objection, portability, or withdrawal of consent. You may also complain to the Nigeria
Data Protection Commission.

## Security

HomeLink uses password hashing, access controls, rate limiting, session revocation,
audit records and other safeguards. No online system can guarantee absolute security.

## Contact

Data-protection questions and requests: {settings.legal_contact_email}

> **Draft notice:** This document must be reviewed and completed with the actual legal
> entity, office address, processor list, retention schedule, lawful bases, cross-border
> transfer details and complaint procedure before production launch.
""".strip()


TERMS_OF_SERVICE_MARKDOWN = f"""
# HomeLink Terms of Service

**Effective date:** {settings.legal_effective_date}

These terms govern use of HomeLink. By creating an account or using protected features,
a user agrees to these terms and the Privacy Notice.

## Platform role

HomeLink provides tools for discovering and posting rentals, properties and marketplace
items. Unless expressly stated otherwise, HomeLink is not the landlord, seller, buyer,
agent, guarantor or party to a transaction between users.

## User responsibilities

Users must provide accurate information, protect their login credentials, comply with
applicable law, avoid fraud or impersonation, and obtain permission to upload content.
Users must independently verify listings, ownership, condition, price and counterparties
before paying or entering an agreement.

## Listings and moderation

HomeLink may review, reject, suspend, archive or remove listings and accounts that are
misleading, unsafe, unlawful, duplicated, unavailable, abusive or contrary to platform
rules. Approval does not guarantee that a listing or user is trustworthy.

## Payments and posting credits

Posting plans and credits are governed by the price and quantity shown before purchase.
A payment is treated as successful only after server-side verification. Test-mode and
mock payments do not move real money and have no cash value.

## Prohibited conduct

Users may not scrape private data, bypass security controls, upload malicious content,
misuse another person's identity, manipulate payments, harass users, or interfere with
the platform.

## Availability and liability

The service may change, pause or experience faults. To the extent allowed by law,
HomeLink does not guarantee uninterrupted availability, transaction completion, listing
accuracy, or the conduct of another user.

## Termination

HomeLink may restrict or terminate access for security, fraud, legal or policy reasons.
Users may request account deletion through the account controls.

## Contact

Questions about these terms: {settings.legal_contact_email}

> **Draft terms:** Obtain Nigerian legal review and insert the operating entity,
> registered address, dispute process, refund policy, limitation wording and governing
> law provisions before production launch.
""".strip()


COOKIE_NOTICE_MARKDOWN = f"""
# HomeLink Cookie Notice

HomeLink may use strictly necessary cookies or similar storage for authentication,
security, session refresh, preferences and fraud prevention. Non-essential analytics or
marketing cookies should remain disabled until the user has received a clear choice and
provided any required consent.

The refresh-token cookie is HTTP-only and is used to maintain a secure authenticated
session. Users can remove cookies through browser controls, although necessary cookies
may be required for signed-in features.

Questions: {settings.legal_contact_email}

> **Draft notice:** Update this notice whenever analytics, advertising or additional
> tracking technologies are introduced.
""".strip()