from app.core.config import get_settings


settings = get_settings()


# ============================================================
# PRIVACY NOTICE
# ============================================================

PRIVACY_POLICY_MARKDOWN = f"""
# HomeLink Privacy Notice

Effective date: {settings.legal_effective_date}

This Privacy Notice explains how {settings.company_legal_name}, referred to in
this notice as HomeLink, collects, uses, stores and shares personal information
when you access or use the HomeLink platform.

HomeLink is designed to help users discover rentals, properties for sale,
marketplace items and approved agent or landlord profiles, and to communicate
about listings and related services.

## 1. Information we collect

When you create or use a HomeLink account, we may collect information such as
your name, email address, telephone number, account role, login and security
information, account settings and records showing your acceptance of HomeLink's
Terms and Privacy Notice.

When you create or interact with a listing, we may process listing descriptions,
prices, locations, addresses, photographs, videos, property information,
marketplace item information, saved listings, inquiries, inspection requests,
reports and other information you choose to provide through the platform.

## 2. Agent and landlord verification information

Users who apply to operate as agents or landlords may be required to provide
additional information and supporting documents for verification.

This may include business or professional information, identity or verification
documents, contact information, office information, areas of operation and other
records reasonably needed to review an application.

Verification information is used for platform safety, fraud prevention,
application review and moderation.

A HomeLink verification or approval means that HomeLink reviewed information or
documents submitted through its current verification process. It is not a
guarantee, warranty or endorsement of every future action or transaction carried
out by that user.

## 3. Payment information

When you purchase HomeLink posting credits, we process information relating to
the transaction such as the HomeLink payment reference, package purchased,
amount, currency, payment status, provider transaction identifier and payment
timestamps.

Card details and other sensitive payment credentials are handled by HomeLink's
payment provider rather than being stored directly by HomeLink.

HomeLink currently uses or plans to use Paystack for payment processing.

## 4. Technical and security information

We may process technical information reasonably necessary to operate and secure
the platform, including IP addresses, browser or device information, session
information, request identifiers, authentication records, security events,
rate-limiting information and audit records.

These records help HomeLink prevent account abuse, investigate suspicious
activity, diagnose technical problems and protect users and the platform.

## 5. Support and communications

When you contact HomeLink, report a listing, request assistance or communicate
through platform features, we may retain the information you provide together
with relevant account, listing or transaction information.

Please do not send passwords, one-time passwords, card PINs or banking
authentication credentials through HomeLink support channels.

## 6. Why we use personal information

HomeLink may process personal information to create and operate accounts,
authenticate users, provide listings and marketplace functionality, facilitate
inquiries, process posting-credit purchases, review agent or landlord
applications, moderate content, investigate reports, prevent fraud, protect
platform security, communicate with users, provide support, maintain records
and comply with applicable legal obligations.

Depending on the activity, processing may be necessary to provide a service
requested by you, comply with legal obligations, pursue legitimate interests in
operating and protecting HomeLink, or rely on consent where consent is the
appropriate legal basis.

## 7. Public information

Some information is intended to be public when you choose to publish it.

For example, published listing titles, descriptions, prices, listing media,
general locations and approved agent or landlord profile information may be
visible to other HomeLink users or visitors.

You should not include sensitive personal information in a public listing unless
it is genuinely necessary and appropriate to publish.

## 8. Service providers

HomeLink uses third-party infrastructure and service providers to operate the
platform.

Depending on the service being used, these providers may include Paystack for
payments, Cloudinary for media storage and delivery, Neon for database
infrastructure, Render for backend hosting, Netlify for frontend hosting,
Upstash for Redis infrastructure and an email provider for transactional email.

These providers may process limited information necessary to provide their
services to HomeLink.

HomeLink may change infrastructure providers where reasonably necessary. This
Privacy Notice will be updated when a change materially affects how personal
information is processed.

## 9. International processing

Some HomeLink service providers may operate infrastructure outside Nigeria.

Where personal information is processed internationally, HomeLink will seek to
use appropriate contractual, technical or other safeguards required under
applicable data-protection law.

## 10. Retention

HomeLink keeps personal information only for as long as reasonably necessary for
the purpose for which it was collected, platform security, fraud prevention,
dispute resolution, accounting, legal compliance or the establishment or defence
of legal claims.

Different records may therefore have different retention periods.

Authentication tokens and expired sessions are removed after defined security
retention periods.

Read notifications may be removed after a defined period.

Payment webhook records and technical logs may be retained for fraud-prevention,
reconciliation and troubleshooting purposes.

Audit records may be retained for longer periods where required for platform
security and accountability.

Agent or landlord verification documents are not intended to be retained
indefinitely after they are no longer required for the active verification
process, subject to security, dispute and legal requirements.

Some payment, audit or transaction records may need to be retained even after an
account is deleted where retention is required by law or reasonably necessary
for accounting, fraud prevention or dispute handling.

## 11. Account deletion

HomeLink provides account-management functionality that allows an eligible user
to request deletion of their account.

Where an account is deleted, HomeLink may anonymise core account information
rather than deleting every record immediately where limited records must be
retained for security, transaction history, dispute handling or legal
requirements.

Deleting an account does not automatically require HomeLink to erase information
that it is legally permitted or required to retain.

## 12. Data export and access

Where available through Account settings, users may request an export of
personal information associated with their HomeLink account.

Users may also contact HomeLink regarding requests to access, correct, delete or
otherwise exercise applicable rights concerning their personal information.

## 13. Your data-protection rights

Subject to applicable law and any lawful limitations, you may have rights to
request information about how your personal data is processed, obtain access to
your personal data, request correction of inaccurate information, request
erasure, request restriction of processing, object to certain processing,
request portability of eligible information and withdraw consent where
processing is based on consent.

You may also have the right to lodge a complaint with the Nigeria Data
Protection Commission.

HomeLink may need to verify your identity before completing certain privacy
requests.

## 14. Security

HomeLink uses technical and organisational safeguards intended to protect
accounts and platform information.

These measures may include password hashing, access controls, authentication
tokens, secure cookies, rate limiting, session revocation, audit logging,
restricted administrator functionality and other security controls.

No website, application or online storage system can guarantee absolute
security. Users are responsible for keeping their passwords and devices secure.

## 15. Users under 18

HomeLink is intended for adults who can independently enter into transactions.

You must be at least 18 years old to independently post listings, purchase
posting credits or transact through or as a result of HomeLink.

HomeLink does not knowingly encourage children to independently conduct property
or marketplace transactions.

## 16. Changes to this notice

HomeLink may update this Privacy Notice when the platform, its providers,
processing activities or applicable legal requirements change.

Where a material change affects existing users, HomeLink may provide an
appropriate notice and, where required, request renewed acknowledgement.

The current version and effective date will be displayed on this page.

## 17. Contact

Questions or requests concerning privacy and personal information may be sent to:

{settings.legal_contact_email}
""".strip()


# ============================================================
# TERMS OF SERVICE
# ============================================================

TERMS_OF_SERVICE_MARKDOWN = f"""
# HomeLink Terms of Service

Effective date: {settings.legal_effective_date}

These Terms govern your access to and use of HomeLink.

By creating a HomeLink account, posting a listing, purchasing posting credits or
using protected platform functionality, you agree to these Terms and acknowledge
the HomeLink Privacy Notice.

## 1. Eligibility

You must be at least 18 years old to independently post listings, purchase
posting credits or enter into transactions through or as a result of HomeLink.

By using those features, you confirm that you are legally capable of entering
into the relevant transaction and complying with these Terms.

## 2. HomeLink's role

HomeLink is a technology platform for discovering and advertising rentals,
properties for sale, marketplace items and agent or landlord services.

Unless HomeLink expressly states otherwise in relation to a particular service,
HomeLink is not the landlord, tenant, property owner, buyer, seller, estate
agent, guarantor, insurer or party to agreements entered into between users.

Users are responsible for deciding whether to proceed with a property,
marketplace or other transaction.

## 3. No university affiliation

HomeLink may organise listings around university campuses and nearby
communities.

References to Olabisi Onabanjo University, campuses or surrounding locations are
used to help users understand geographic relevance and do not by themselves
mean that HomeLink is owned, operated, endorsed or guaranteed by the university.

Any formal partnership will be identified expressly where applicable.

## 4. Accounts

You must provide accurate account information and keep your contact information
reasonably current.

You are responsible for protecting your password and for activity carried out
through your account unless the activity results from a security failure for
which HomeLink is legally responsible.

You must not sell, transfer, impersonate another person through or provide
unauthorised access to a HomeLink account.

## 5. Listing authority and accuracy

A user who posts a listing confirms that they have the right or appropriate
authority to advertise the property, accommodation, item or service.

The person posting a listing is responsible for the accuracy of its title,
description, price, location, photographs, videos, availability, condition,
fees, documents and other statements.

Listings must not deliberately hide material defects, charges or restrictions.

A listing must be updated or removed when it is no longer genuinely available.

## 6. Property and rental listings

Property and rental posters must provide information honestly and must not claim
ownership, authority, documentation, facilities or property characteristics that
they do not have reasonable grounds to represent as true.

Prospective tenants or buyers should independently inspect property, confirm the
identity and authority of the person offering it, review relevant documents and
understand the complete financial terms before making significant payments or
entering an agreement.

HomeLink does not replace professional legal, property, valuation or inspection
advice.

## 7. Agent and landlord verification

HomeLink may review information and documents submitted by agents or landlords
before approving a profile.

An approved or verified status means that the user passed HomeLink's applicable
review process using the information available at the time.

Verification is not a guarantee of identity against every form of fraud, a
guarantee of property ownership, a warranty of professional competence or an
endorsement of every transaction that the verified user may later enter into.

Users must continue to exercise reasonable care.

## 8. Marketplace listings

Marketplace sellers must accurately describe the item, its condition, known
faults, included accessories and price.

Users must not use HomeLink to advertise unlawful, stolen, counterfeit or
fraudulent goods, prohibited substances, unlawful weapons or other products or
services that cannot lawfully be offered.

HomeLink may restrict additional categories where reasonably necessary for
safety, legal compliance or platform integrity.

## 9. Inspections, meetings and communications

HomeLink may provide inquiry, messaging, contact or inspection-related tools.

Users remain responsible for arranging meetings safely and independently
deciding whether another user or listing is suitable.

You should avoid sharing passwords, one-time passwords, card PINs or unnecessary
sensitive information with another user.

Where reasonably possible, property should be inspected before significant
off-platform payment is made.

## 10. Listing moderation

HomeLink may review, reject, limit, suspend, archive or remove content where it
reasonably believes the content is inaccurate, misleading, duplicated,
unavailable, abusive, unlawful, unsafe or inconsistent with platform rules.

HomeLink may also request additional information before publishing or restoring
a listing.

Moderation approval does not constitute a guarantee that a listing, property,
item or user is genuine or suitable for a particular person.

## 11. Free listing allowances

HomeLink may provide free listing allowances to eligible accounts.

The quantity and conditions of free listings may differ by listing category and
may change as the platform develops.

The current allowance displayed by HomeLink at the time you post governs your
available free posting entitlement.

Free listing allowances have no cash value and cannot ordinarily be transferred
between accounts.

## 12. Paid posting credits

HomeLink may sell posting credits for specific listing categories.

The package description, quantity, price, currency and listing category shown
before checkout form part of the purchase information for that transaction.

Rental, Property and Marketplace credits are separate. A credit bought for one
listing category cannot be used for another category unless HomeLink expressly
provides a conversion or transfer feature.

Purchased credits have no cash value outside HomeLink and cannot be withdrawn as
cash.

## 13. Payment processing

HomeLink may use a third-party payment provider such as Paystack to process
payments.

A posting credit is granted only after HomeLink receives or independently
verifies confirmation that the required payment was successful.

Starting checkout does not itself create a paid-credit entitlement.

Pending, abandoned, cancelled or failed payment attempts do not create paid
credits.

HomeLink may retain payment references and transaction-status information for
reconciliation, support, security and fraud prevention.

## 14. Refunds

Purchased posting credits are normally non-refundable once they have been used
to obtain or submit the relevant paid listing entitlement, except where a refund
is required by applicable law.

Where an unused purchase was made accidentally, duplicated or affected by a
clear payment error, the user may contact HomeLink support and request a review.

Such requests will be considered individually using the payment record,
whether any credit has been consumed, the circumstances of the purchase and any
applicable consumer rights.

HomeLink does not promise that every unused credit purchase will qualify for a
refund.

Nothing in this section removes a consumer right that cannot lawfully be
excluded.

## 15. Payments between users

Unless expressly identified as a HomeLink payment service, rent, deposits,
property purchase payments and marketplace payments made directly between users
are outside HomeLink's posting-credit payment system.

HomeLink does not hold or guarantee money that users transfer directly to each
other.

Users should independently verify payment details and the person receiving
payment.

## 16. Reports and complaints

Users may report suspicious, misleading, unsafe or inappropriate listings using
available HomeLink reporting and support channels.

HomeLink may review account, listing, communication and transaction-related
records that are reasonably relevant to investigating a report.

Submitting a report does not guarantee a particular moderation outcome, but
HomeLink will aim to assess reports reasonably in accordance with platform
rules.

## 17. User content

You retain ownership of content that you lawfully own.

By uploading listing photographs, videos, descriptions or other content to
HomeLink, you give HomeLink a non-exclusive permission to host, store, reproduce,
resize, optimise, display and distribute that content as reasonably necessary to
operate, moderate and promote the relevant listing and the HomeLink platform.

You confirm that you have the rights or permission required to upload the
content.

This permission ends when the content is no longer reasonably needed for the
platform, subject to backups, security records, dispute records and legal
retention requirements.

## 18. Prohibited conduct

You must not use HomeLink for fraud, impersonation, harassment, unlawful
activity, malicious software, attempts to bypass platform security, unauthorised
access, artificial manipulation of listings or accounts, or deliberate
misrepresentation.

You must not interfere with HomeLink's technical systems or use automated tools
in a way that materially harms platform availability or security.

## 19. Suspension and account action

HomeLink may restrict, suspend or deactivate an account where reasonably
necessary to investigate fraud, protect users, enforce these Terms, respond to
legal requirements or protect platform security.

Where appropriate, HomeLink may require corrective action or additional
verification before access is restored.

Serious or repeated violations may result in permanent loss of access.

## 20. Platform availability

HomeLink aims to provide a reliable service but cannot guarantee uninterrupted
or error-free availability.

Maintenance, service-provider outages, security incidents, network conditions
or other circumstances may temporarily affect access.

HomeLink may modify or discontinue features where reasonably necessary.

## 21. Disclaimers

Users should make independent decisions about properties, marketplace items and
people they meet through HomeLink.

HomeLink does not guarantee that every listing will remain available, every
description will be correct, every user will act honestly or every transaction
will be completed successfully.

Nothing in these Terms excludes obligations, warranties or consumer rights that
cannot lawfully be excluded.

## 22. Limitation of liability

To the extent permitted by applicable law, HomeLink is not responsible for
losses arising solely from agreements, representations, payments or conduct
between independent users where HomeLink is not a party to the underlying
transaction.

This limitation does not apply where liability cannot legally be excluded or
where loss results from conduct for which HomeLink is legally responsible.

## 23. Changes to these Terms

HomeLink may update these Terms as its services, pricing model, safety controls
or legal obligations develop.

Material changes may be communicated through the platform or by another
reasonable method.

Where required, HomeLink may ask existing users to accept a new Terms version
before continuing to use protected functionality.

## 24. Governing law

These Terms are governed by the laws applicable in the Federal Republic of
Nigeria, subject to any mandatory consumer protections or other rights that
apply.

## 25. Contact

Questions about these Terms or a HomeLink transaction record may be directed to:

{settings.legal_contact_email}
""".strip()


# ============================================================
# COOKIE NOTICE
# ============================================================

COOKIE_NOTICE_MARKDOWN = f"""
# HomeLink Cookie Notice

Effective date: {settings.legal_effective_date}

This Cookie Notice explains how HomeLink uses cookies and similar browser
storage technologies when you use the platform.

## 1. What cookies are

Cookies are small pieces of information stored or sent by a website or service
to help provide functions such as authentication, security and preferences.

HomeLink may also use browser storage such as local storage for limited
application preferences or state.

## 2. Essential authentication cookies

HomeLink uses an authentication refresh cookie to help keep signed-in users
securely authenticated.

In production, the authentication cookie is intended to use security controls
such as HttpOnly and Secure attributes.

Because the cookie is required for authenticated account functionality,
disabling it may prevent login sessions from operating correctly.

The authentication cookie is not intended to contain your password.

## 3. Browser storage

HomeLink may use browser storage for limited functions such as remembering that
you acknowledged the Cookie Notice, storing interface preferences or retaining
a non-sensitive session indicator.

Sensitive credentials such as your password or payment-card PIN should not be
stored in browser preference storage.

## 4. Payments and external services

When you choose to make a payment, you may be redirected to or interact with a
third-party payment provider such as Paystack.

That provider may use its own cookies or similar technologies under its own
privacy and cookie practices.

HomeLink does not control cookies placed directly by an independent third-party
website when you visit that provider.

## 5. Media and infrastructure

HomeLink may use services such as Cloudinary to deliver images or media and
other infrastructure providers to operate the platform.

Technical requests to these services may involve network information required
to deliver the relevant resource.

## 6. Analytics and advertising

HomeLink does not currently intend to use advertising cookies or behavioural
advertising cookies as part of its launch configuration.

HomeLink also does not currently rely on optional analytics cookies that require
a user to accept tracking before ordinary use of the platform.

If HomeLink later introduces optional analytics, advertising or other
non-essential tracking technologies, this notice and any required consent
controls will be updated before those technologies are relied upon.

## 7. Cookie choices

You may configure your browser to block or remove cookies.

Blocking essential authentication cookies may prevent you from remaining signed
in or using account functionality.

Where HomeLink introduces a genuinely optional cookie category, HomeLink will
provide applicable choices where required.

## 8. Retention

Authentication cookies and browser-storage entries may remain for different
periods depending on their purpose.

Authentication sessions expire according to HomeLink's security configuration
and may be revoked earlier when you log out, change security information,
delete your account or when HomeLink detects a security reason to revoke them.

You may clear cookies and browser storage using your browser settings.

## 9. Changes to this notice

HomeLink may update this Cookie Notice where the technologies used by the
platform change.

The current version and effective date will be displayed on this page.

## 10. Contact

Questions concerning HomeLink's use of cookies or personal information may be
sent to:

{settings.legal_contact_email}
""".strip()