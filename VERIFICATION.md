# ROOT Verification Record

This record describes the verification completed for the current ROOT build and identifies the final acceptance actions that require a member to exercise their own authenticated account. ROOT contains no seeded member data, fabricated testimonials, fictional services, or sample emergency resources.

## Completed automated checks

| Verification area | Evidence | Result |
|---|---|---|
| Type safety | `pnpm check` | Passed after the final application changes. |
| Unit and router tests | `pnpm test` | Passed: 7 test files and 28 tests. |
| Exact Truth Talk claim labels | Policy test checks the six approved labels. | Passed. |
| TruthOK semantics | Policy test checks four discrete states and contains no binary verdict output. | Passed. |
| Consent receipt | Policy test checks recipient, fields, purpose, and expiry language. | Passed. |
| Private access | Router tests reject unauthenticated profile, permission, member-record, Truth Talk, and vouch access. | Passed. |
| Consent ownership | Router test confirms the signed-in owner is passed to consent revocation. | Passed. |
| Vouch authority | Router tests allow only a recipient to respond and only a participant to revoke. | Passed. |
| Emergency location | Policy test asserts that location persistence is false. | Passed. |
| Local file proof | Policy test checks stable SHA-256 digest derivation without file upload. | Passed. |
| Analytics guard | Policy test confirms the ROOT entry document has no Umami or website-id script loader. | Passed. |

## Completed visual checks

The public ROOT gateway was reviewed at desktop and phone-sized viewports. The member identity workspace was also reviewed at desktop and phone-sized viewports. A mobile overflow caused by the horizontally scrollable member navigation was corrected and rechecked. The current interface preserves readable typography, visible action controls, high-contrast buttons, and a mobile horizontal navigation strip for member sections.

## Completed issuer and Monarch checks

On August 11, 2026, the authenticated First Executive session opened the dedicated `/issuer/nodes` route. The live issuer ledger displayed the active **A1 · NEXINUS Business Anchor** for Mendocino County, California, together with the seventeen planned A2–A3, R1–R6, and S1–S9 mandates. The session executed **Mark reviewed** for A1 and received the confirmation message “Monarch node review recorded.” The private audit ledger then displayed a new **Reviewed** event stating that the node mandate and capability manifest had been reviewed.

The application’s current automated suite contains seven test files and twenty-nine passing tests. Its Monarch authorization coverage confirms that only the First Executive can register, review, or suspend a node, and that a service record cannot be assigned to a planned or inactive node.

## Completed private operator-intake checks

The authenticated First Executive issuer workspace displays private text fields for a candidate ROOT member code, name or role-facing label, least-privilege role, regional scope, and conflict disclosure. Submitting the form saves a private intake only; it does not create an active operator record or directory authority. The router tests reject ordinary-member access to the private queue and require an explicit First Executive approval before the existing operator-approval helper is called. Each approval or decline now appends a separate private intake-decision audit entry with its actor, timestamp, and decision note; the issuer interface renders that ledger as read-only historical evidence.

## Completed private personal-code check

On August 11, 2026, the authenticated owner generated a private personal ROOT code in the Member Gateway Identity panel. The code is visible only in the signed-in owner workspace. A database check confirmed that creating this card did not create a second operator record or change the existing business First Executive role. The personal code is therefore a private identity reference, not a second login or an independent operator principal.

The duplicate Directory Steward intake that referenced the existing business First Executive identity was declined on the owner’s explicit confirmation. The private intake ledger shows the declined state and decision note, and the separate append-only audit ledger records the First Executive actor and timestamp. The active roster remains unchanged with only the First Executive record active.

## Completed Project Reclaim checks

ROOT now includes a public Project Reclaim page, a private member-interest panel, and a First Executive source-control panel. The integration reflects the supplied white paper’s six pillars—Health, Housing, Work, Education, Community, and Independence—without presenting ROOT as an employer, placement agency, service provider, or partner of listed organizations. A database verification confirmed exactly two A1-linked, published Mendocino County sources (CalWORKs Job Services and the Community Development Commission) and two Lake County internal watchlists (Lake County Housing and Lake County Behavioral Health Services). The Lake entries have no node assignment and cannot enter the public directory until a reviewed, county-matched mandate exists.

The signed-in Member Gateway displayed only the two published Mendocino sources and excluded both Lake County watchlists. Its empty private-interest ledger described that notes are not forwarded to providers, employers, or county agencies. Router coverage confirms that the public source endpoint delegates only to the published-source query, interest writes include the authenticated member as `ownerUserId`, interest reads are limited to that owner, and internal watchlists are rejected as interest targets.

With the owner’s explicit confirmation, the Member Gateway saved one neutral interest note against the published Community Development Commission source. The note appeared only in the signed-in member’s private ledger. A read-only database check confirmed one interest record owned by the signed-in user and linked to a published source; the public Project Reclaim page and First Executive source-control panel displayed source metadata only, with no member-interest content.

## Completed A1 regional-directory acceptance

On August 11, 2026, the authenticated First Executive session used the corrected `/issuer?tab=services` and `/issuer?tab=emergency` deep links to publish two source-verified Mendocino County records: Employment & Family Assistance Services — Ukiah and Behavioral Health & Recovery Services’ 24/7 Crisis Line. Each record visibly displayed **A1 · NEXINUS Business Anchor** in its managed ledger and carried its publication, verification, and review dates. A direct database check confirmed the persisted `nodeId` is A1 for both entries.

## Member acceptance scenarios

These actions require a real authenticated member account and must be completed before a public launch. They are designed as a concise acceptance walkthrough rather than hidden behavior.

| Scenario | Expected result |
|---|---|
| Update display name | The member sees their own code and verification level, changes a display name, and the value persists after reload. |
| Grant and revoke access | The member creates a named, field-scoped grant, receives a human-readable receipt, then revokes the grant from the permissions ledger. |
| Publish Truth Talk claim | The member selects one approved claim type, optionally derives a local file hash, adds sources, publishes, and sees four individual TruthOK signals plus an integrity receipt. |
| Vouch lifecycle | One member sends a scope-specific vouch; the recipient accepts or declines; either participant can later revoke it. |
| Service proof | A service record published by an authorized operator returns a minimum eligibility result without exposing attestations or member-record details. |
| Emergency lookup | Any visitor provides explicit one-time location consent, gets a resource lookup, and sees the no-persistence notice. No location record appears in the database. |

## Product limitations for launch planning

ROOT’s emergency-resource directory and services directory intentionally start empty because no verified real providers or resources were supplied. Populate them only from vetted, current sources and with clear provider verification procedures. The current file-integrity feature derives a local SHA-256 digest and stores only that digest with a post; it does not upload, retain, or disseminate the selected source file.
