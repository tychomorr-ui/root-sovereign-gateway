# ROOT Issuer Acceptance Limitation

## Recorded blocker

On the current development browser session, the project-owner administrator could not complete the ROOT Issuer Workspace sign-in because the Cloudflare verification step did not complete. This is an external browser-authentication blocker rather than an authorization failure in ROOT.

## Evidence completed without browser sign-in

The project-owner account already exists in the ROOT database with the `admin` role. ROOT has created the corresponding private **First Executive** operator record, with an active status, conflict-disclosure confirmation, approval audit event, and a three-month review date. The source-verified XINUS Chrysalis, 988 Lifeline, and United Way 211 directory records were created with publication dates and review dates.

The server contract is covered by automated tests for protected member routes, operator role boundaries, issuer actions, directory publication changes, directory review operations, and ordinary-member denial. Type checking and the full test suite pass.

## Deferred live acceptance

When Cloudflare sign-in succeeds, the First Executive should open `/issuer` and complete this brief acceptance pass: confirm the roster tab lists the First Executive; open the Services and Emergency Directory tabs; verify the official source links, published status, and review dates; use the review control on one record; and confirm ordinary member accounts cannot reach the Issuer Workspace.

This deferred test does not invalidate the existing database, authorization, or automated verification evidence. It is retained as a final browser-session acceptance step before public deployment.
