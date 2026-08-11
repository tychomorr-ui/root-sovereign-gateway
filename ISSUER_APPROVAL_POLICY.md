# ROOT Issuer Approval Policy

> **Purpose.** ROOT issuers create scoped attestations and maintain directory records. They do not assign a universal human score, override member consent, or publish unverified claims.

## 1. Approval standard

An operator may be approved only by an active administrator. Approval requires a documented operating role, a named approving administrator, an approval date, a conflict-of-interest disclosure, and acceptance of this policy. ROOT retains only the minimum roster metadata necessary to administer authority; operator personal profiles are not exposed publicly.

| Control | Required rule |
|---|---|
| Least privilege | Assign only the narrowest active role needed: **First Executive**, **Issuer**, **Directory Steward**, or **Incident Reviewer**. |
| Attestation scope | Every attestation must name the member, issuer label, issuer kind, exact scope, and evidence status. |
| Evidence threshold | “Verified” requires a current, documented primary or official source. “Declared” must not be presented as independently verified. |
| Conflict handling | An operator must not approve an attestation or directory record in which they have an undisclosed personal, financial, or organizational conflict. |
| Directory publication | A service or emergency record must include an official public source URL and remain a draft until a designated Directory Steward confirms it is current. |
| Emergency caution | Emergency directory entries are resource pointers, not medical, legal, or crisis advice. Where immediate danger is indicated, the product must direct people to local emergency services. |
| Revocation | An active administrator may suspend an operator or revoke an attestation immediately when evidence is incorrect, expired, compromised, or contested. |

## 2. Approval workflow

The approving administrator confirms the candidate’s role, minimum-access requirement, conflict disclosure, and understanding of the evidence standard. The roster entry records the approval date and approving administrator. The operator remains active until suspension, departure, or scheduled review.

Every issuance and directory action is attributable to the authenticated operator record. A suspension removes operational authority without deleting the historical audit trail.

## 3. Review cadence

The First Executive reviews active operators quarterly, reviews emergency contacts at least monthly, and reviews published services at least quarterly or whenever the source changes. Any unresolved dispute, stale source, or unaddressed conflict requires unpublishing or suspension until remediation is documented.

## 4. Initial roster

ROOT’s initial roster contains one **First Executive** account: the authenticated project owner. That account may approve later operators, but day-to-day issuer or directory activity should be delegated using a separate narrow role whenever possible.
