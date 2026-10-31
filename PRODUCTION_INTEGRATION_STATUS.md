# ROOTGATE / Truth Talk Integration Status

Audit date: 2026-10-31

## Current architecture

- **Rootgate:** ROOT’s existing React/Express/tRPC application, published separately on the Manus-hosted ROOT domain and represented by the current WebDev project `root-sovereign-gateway`.
- **Truth Talk:** The current `/truth` route is a **native ROOT surface** and remains preserved. A separate static Truth Talk SPA is also live at `https://rootgate.nexinus.net/truthtalk/` on the DigitalOcean ROOT-GATE node.
- **Deployment evidence:** The DigitalOcean host `rootgate.nexinus.net` returns HTTP 200 for `/truthtalk/`, `/.well-known/atmos-identity.json`, and `/health`; `/truth` returns HTTP 404. The standalone SPA is the verified public Truth Talk path, while `/truth` is not the standalone app.
- **Data boundary:** The standalone release is documented as static-only and has no configured account service, application database, remote messenger, media host, or upload endpoint. ROOT’s native `/truth` feed continues to use ROOT-owned `truth_posts`; no separate Truth Talk-owned backend/data boundary is verified.
- **Identity boundary:** ROOT authentication is the current identity mechanism. A separate Rootgate-to-external-Truth-Talk identity handoff was not found.
- **Archangel receipt boundary:** ROOT now accepts Penguin’s confirmed `ARCHANGEL/v0` signed-status envelope through a First Executive-only import procedure. Penguin canonicalizes the inner payload with sorted JSON and signs `${payload_cid}|${ts}` using Ed25519. ROOT recomputes the payload CID, compares the raw public key to the pinned trust root, verifies that exact signature, rejects stale/duplicate/tampered records, and stores the signed envelope as provenance. The imported record is explicitly bounded to `SIGNED_NODE_STATUS_OBSERVATION_NOT_SERVICE_AUTHORITY`; it cannot publish Truth Talk claims, grant service authority, or activate arbitrary node control.

## Explicit status

```text
ROOTGATE_TRUTHTALK_ROUTE = native_root_surface_plus_verified_static_spa
ROOTGATE_TRUTHTALK_IDENTITY_HANDOFF = PENDING_CONTRACT
TRUTH_TALK_SOURCE = TRUTH_TALK_STATIC_RELEASE_SOURCE_NOT_ATTACHED
TRUTH_TALK_EXTERNAL_DEPLOYMENT = VERIFIED_AT_ROOTGATE_TRUTHTALK_PATH
TRUTH_TALK_DATA_BOUNDARY = ROOT_OWNED_IN_CURRENT_BUILD
ARCHANGEL_RECEIPT_IMPORT = IMPLEMENTED_AND_PINNED
ARCHANGEL_RECEIPT_CONTRACT = ARCHANGEL/v0
ARCHANGEL_RECEIPT_TRUST_ROOT_FINGERPRINT = 5a7d0be5747b2a61bbe4a5d95772ae50a469688e85d40028b501c893dea2013a
```

These states are deliberately explicit. ROOT verifies the standalone static Truth Talk path, but does not claim that a Truth Talk API, separate database, cross-application identity handoff, or signed receipt-import contract exists until those facts are established by source and production evidence.

## Public read-only checks

The following DigitalOcean hostnames returned HTTP 200 for both `/.well-known/atmos-identity.json` and `/health`, with `status: ok` in the health response:

- `rootgate.nexinus.net` → node `ROOT-GATE`
- `terminus.nexinus.net` → node `TESSERACT-TERMINUS`
- `clarity.nexinus.net` → node `XINUS-CLARITY`
- `monarch.nexinus.net` → node `MONARCH-OS`
- `tesseract.nexinus.net` → node `TESSERACT-A`
- `reclaim-node.nexinus.net` → node `PROJECT-RECLAIM`
- `witness.nexinus.net` → node `WITNESS`

The signed public manifests and health documents were inspected without exposing private keys. Public reachability is not treated as application or cryptographic integration proof beyond the fields actually returned by each document.

The standalone Truth Talk path `https://rootgate.nexinus.net/truthtalk/` returned HTTP 200 with an HTML SPA shell. This verifies static frontend delivery only; it is not evidence of a Truth Talk API, database, media service, or Rootgate identity handoff.

## Files inspected

- `client/src/App.tsx`
- `client/src/pages/TruthTalk.tsx`
- `client/src/pages/Home.tsx`
- `server/rootRouter.ts`
- `server/atmosDb.ts`
- `shared/atmos.ts`
- `shared/const.ts`
- `.project-config.json`
- `package.json`
- `server/_core/index.ts`
- `drizzle/schema.ts`

## Files changed for this audit boundary

- `shared/const.ts` — added the explicit integration status constants.
- `client/src/pages/TruthTalk.tsx` — added a visible boundary notice identifying the route as a native ROOT surface and the external identity handoff/source as pending/not present.
- `client/src/pages/Home.tsx` — changed the public dedicated Truth Talk navigation and CTA to the verified DigitalOcean `/truthtalk/` path; the native `/truth` route remains available.
- `server/archangelReceipts.ts` — added ARCHANGEL/v0 canonical payload-CID verification, `${payload_cid}|${ts}` Ed25519 verification, pinned raw public-key comparison, duplicate rejection, expiry checks, receipt hashing, and provenance-preserving storage.
- `server/archangelReceipts.test.ts` — added valid-signature, missing-trust-root, payload-tamper, and signer-mismatch regression coverage.
- `server/archangelSecret.test.ts` — validates the configured trust root through the lightweight contract-status API.
- `drizzle/schema.ts` / `drizzle/0012_outgoing_rocket_raccoon.sql` / `drizzle/0013_wise_rocket_racer.sql` — added the additive Archangel receipt-import ledger and nullable fields required by the actual envelope.
- `server/rootRouter.ts` / `client/src/pages/AtmosEnrollment.tsx` — added First Executive-only contract status, JSON import, and signed receipt visibility.
- `PRODUCTION_INTEGRATION_STATUS.md` — recorded the evidence and blockers.

## Remaining blockers

1. **SERVER_ACCESS_REQUIRED:** The DigitalOcean droplets are reachable over HTTPS, but this execution environment has no SSH private key and batch SSH access failed with `Permission denied (publickey)`. Read-only server inspection of systemd, nginx, service directories, and logs therefore remains unavailable.
2. **TRUTH_TALK_SOURCE_NOT_PRESENT_IN_CURRENT_SESSION:** The standalone static release is verified at `/truthtalk/`, but its source repository and any server-backed Truth Talk data plane were not attached or discoverable in the current session.
3. **ROOTGATE_TRUTHTALK_IDENTITY_HANDOFF = PENDING_CONTRACT:** No supported cross-application session or identity handoff contract was found, so none was invented.
4. A versioned Rootgate identity handoff is still required before ROOT can activate a cross-application connection beyond the verified static path.
5. Receipt trust is now pinned to the public key derived from Penguin’s `/home/kether_gate/atmos-operator-v2/keys/archangel.pem`; its fingerprint matches the live Archangel governance manifest. A receipt still does not imply service authority or Truth Talk publication.

No DNS records, DigitalOcean files, databases, private keys, or external services were modified by this audit.
