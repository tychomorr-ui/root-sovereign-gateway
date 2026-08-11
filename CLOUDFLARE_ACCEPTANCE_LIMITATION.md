# ROOT Issuer Acceptance Limitation

## Recorded blocker

On the current development browser session, the project-owner administrator could not complete the ROOT Issuer Workspace sign-in because the Cloudflare verification step did not complete. This is an external browser-authentication blocker rather than an authorization failure in ROOT.

## Evidence completed without browser sign-in

The project-owner account already exists in the ROOT database with the `admin` role. ROOT has created the corresponding private **First Executive** operator record, with an active status, conflict-disclosure confirmation, approval audit event, and a three-month review date. The source-verified XINUS Chrysalis, 988 Lifeline, and United Way 211 directory records were created with publication dates and review dates.

The server contract is covered by automated tests for protected member routes, operator role boundaries, issuer actions, directory publication changes, directory review operations, and ordinary-member denial. Type checking and the full test suite pass.

## Deferred live acceptance

When Cloudflare sign-in succeeds, the First Executive should open `/issuer` and complete this brief acceptance pass: confirm the roster tab lists the First Executive; open the Services and Emergency Directory tabs; verify the official source links, published status, and review dates; use the review control on one record; and confirm ordinary member accounts cannot reach the Issuer Workspace.

This deferred test does not invalidate the existing database, authorization, or automated verification evidence. It is retained as a final browser-session acceptance step before public deployment.

## Live acceptance recovery

The personal-browser session was subsequently connected and the project-owner account completed ROOT sign-in. The signed-in Issuer Workspace displayed the active First Executive roster record and its approval audit. The Services tab displayed the published XINUS Chrysalis record with its source-review and publication controls. The Emergency Directory displayed the published 988 Lifeline and United Way 211 records with their official source links, review dates, and publication controls.

The First Executive successfully invoked the live **Mark reviewed** control for XINUS Chrysalis, 988 Lifeline, and United Way 211. ROOT displayed success notices for the service and emergency-resource actions, and database verification confirmed refreshed `verifiedAt` timestamps and their corresponding review-due dates. The ROOT request log also records `resourceId: 2` for the United Way 211 review mutation, with a successful `reviewed: true` response. This completes the interactive roster, publication-state, and review-cadence acceptance evidence for the initial records.

The Issuer Workspace now displays publication, verification, and review-due dates directly on the XINUS Chrysalis, 988 Lifeline, and United Way 211 record panels. This exposes the same operational evidence that was previously available only through the private database check.

## Final capture limitation and accepted evidence

After the United Way 211 review mutation completed, the connected personal-browser extension returned repeated timeout responses and could not provide an additional visual capture. The completed ROOT server request log records a successful `root.issuer.directories.emergency.markReviewed` call for `resourceId: 2`, and the verified database row confirms the refreshed `verifiedAt` and `reviewDueAt` values while preserving a published state. The project owner directed ROOT to proceed using this evidence. This is accepted as the final evidence for the completed United Way 211 review action; the unavailable duplicate browser capture is documented rather than silently omitted.
