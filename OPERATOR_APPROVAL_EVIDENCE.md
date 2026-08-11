# Directory Steward Approval Evidence

## Scope

This record documents the substitute evidence path used when the browser-control session was unavailable. It does **not** claim that the active browser session was verified. The user explicitly approved the submitted Directory Steward intake after reviewing its scope and conflict disclosure.

## Protected Approval Path

The activation used ROOT’s existing protected procedure, `issuer.operators.intakes.approve`, through an internal First Executive caller. Before approval, the procedure validated that the actor was the configured administrator and an active First Executive operator; it then required that intake `60001` remained in submitted status and that the candidate member profile resolved correctly. The approval procedure created the active operator record, updated the intake to approved, and wrote an intake decision audit.

No direct table update was used to activate the role. One-time local maintenance utilities containing private member-code material were removed after the completed workflow and verification.

## Verified Outcome

| Record | Verified value |
|---|---|
| Operator | Mendocino & Lake Directory Steward |
| Governance role | `directory_steward` |
| Status | `active` |
| Approved by | First Executive, user ID `1` |
| Review due | 2026-11-11 UTC |
| Intake | `60001`, `approved` |
| Intake review actor | First Executive, user ID `1` |
| Operator audit | `approved` by user ID `1` |
| Intake audit | `approved` by user ID `1` |

## Least-Privilege Verification

The activated Directory Steward can access service-directory management, emergency-directory management, and Project Reclaim source review. The same account is denied the operator roster, Monarch node registry, attestation issuance, and an attempted Lake County public publication. The approval scope itself also retains the explicit boundary: Lake County work is private watchlist monitoring only, with no public Lake County publication authority.

## Outstanding UI Evidence

The browser-control session remains a separate technical follow-up. When control is restored, the `/issuer` page should be opened in the active account and its First Executive identity should be confirmed through the normal interface. This UI evidence is supplementary; it does not alter the existing protected approval and audit record.
