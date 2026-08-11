# Truth Talk Expansion Roadmap

**Status:** Product direction for the next Truth Talk build stages. This roadmap does not alter ROOT’s present provenance rules, operator boundaries, or privacy defaults.

## Product Thesis

Truth Talk should feel as immediate and navigable as a high-quality media feed while behaving unlike an engagement-maximizing social network. A reader should be able to move quickly through short reports, firsthand accounts, analysis, corrections, and questions; then stop at any moment to inspect **who made the declaration, what kind of declaration it is, what sources or files were declared, what changed, and what remains unresolved**.

> Truth Talk does not certify universal truth. It preserves the path by which a claim is made, supported, challenged, corrected, and reviewed.

The product therefore combines three surfaces. The first is a mobile-first viewing experience with vertical swipe navigation. The second is a desktop reading and research experience with context, source routes, related corrections, and collection views. The third is a member-controlled publishing workspace that treats authorship, evidence disclosure, corrections, and visibility as deliberate actions rather than invisible platform defaults.

## The Core Contract

| Product requirement | Truth Talk behavior |
|---|---|
| Fast discovery | Vertical short-form cards on mobile; focused story deck and collections on desktop. |
| Evidence-led reading | Every declaration exposes its declared type, integrity receipt, source routes, and individual TruthOK signals. |
| Corrections without erasure | Corrections and withdrawals link to the original record; the earlier record remains legible as historical context. |
| No engagement manipulation | No hidden popularity rank, follower-reputation score, ad targeting, or behavioral profile. |
| Member control | Authors choose visibility, declared sources, and file-digest disclosure. Readers do not need to surrender private ROOT records to read public material. |
| Federation-ready posture | Identity and provenance can be expressed through portable identifiers and signed record envelopes, subject to a later security review. |

## Experience Architecture

### 1. Signal Feed: Short-form discovery

The existing `/truth` route is the starting point. Its final form should present one declaration per viewport on mobile. A viewer swipes vertically through concise visual cards that always preserve a visible claim label, author context, and provenance access point. This is the speed and rhythm people expect from a modern media experience, but the card does not become an isolated attention object: the source chain, integrity receipt, corrections, and uncertainty indicators remain one gesture away.

The feed should support transparent filters, not opaque recommendation claims. Readers can choose declared claim type, topic, region, language, time range, source status, and correction status. Default ordering should be stated plainly—for example, newest published declaration, newest correction, or an editorial collection selected by a named human steward. ROOT should never label an opaque output as “what you need to know.”

### 2. Source Room: Long-form verification

Each declaration should open a Source Room. This is the reading experience for a longer text, transcript, video or audio reference, image evidence, formal document, or source bundle. The Source Room should show a persistent provenance rail with the original author declaration, linked sources, content digest when supplied, signal-by-signal status, corrections, review notes, and related claim threads.

Source Room media handling must preserve consent and ownership. Original media is not silently copied or rehosted merely because it is linked. When a contributor chooses to upload evidence in a later phase, ROOT should store an access-controlled file reference and a digest, then let the contributor revoke or change the sharing grant subject to any published-record policy disclosed at the time of publication.

### 3. Civic Thread: Discussion without a reputation casino

Truth Talk can support Reddit-like discussion structure without importing Reddit-like score incentives. A thread should be scoped to one declared claim or source. Responses should be typed as **question, supporting source, counter-source, analysis, correction, or context**. Each response carries its own provenance information and may be attached to a particular sentence, clip interval, source reference, or claim version.

The interface should privilege useful structure over popularity. Instead of a global karma score, readers can view the thread by response type, declared source availability, author-issued correction, or named steward review. Any later community endorsement must remain scoped, revocable, and non-transferable; it must never become a hidden social-credit measure.

## Evidence and Correction Model

| Record | Required fields | Optional fields | Prohibited shortcut |
|---|---|---|---|
| Declaration | Author binding, declared claim type, body or media statement, visibility, integrity receipt | Sources, file digest, topic, region, language | A platform-issued true/false verdict. |
| Source | URL or user-controlled file reference, declared relation to claim | Archive reference, excerpt, access note | Treating a link as proof without showing what the author declares it supports. |
| Correction | Linked original declaration, correction type, explanation, new claim version | Supporting source, reviewer note | Silent replacement or deletion of the original public record. |
| Challenge | Linked claim or source, declared challenge type, explanation | Counter-source, uncertainty note | Anonymous pile-on behavior or reputation attack. |
| Review note | Named and authorized review role, scope, timestamp | Limited finding and methodology note | A universal authority claim or private evidence exposure. |

TruthOK remains a set of separate signals: **identity-bound, integrity-bound, sources-declared, and review-completed**. A complete signal says something narrow about the record process, not whether the claim is universally true. This distinction protects readers from false certainty while still making evidence quality inspectable.

## Federation and Interoperability

Truth Talk can borrow from decentralized relay models without committing ROOT to unreviewed network behavior. The right sequence is a **portable record envelope** first, network exchange second. Each public declaration can be represented as a signed, versioned envelope containing a portable author identifier, canonical claim payload, integrity receipt, source references, a correction relation, and an explicit visibility or distribution grant.

In a later pilot, a ROOT member could authorize publication of a specific public envelope to one or more named relays. Relays should be treated as distribution points, not trusted custodians of the member’s whole ROOT record. A relay receives only the public declaration envelope and its declared distribution scope; it never receives the member’s permissions ledger, private record, location, vouches, or unpublished work.

| Rollout level | Capability | Boundary that must remain intact |
|---|---|---|
| Level 1: ROOT native | Public feed, Source Room, declarations, corrections, provenance signals | Private ROOT data remains private by default. |
| Level 2: Portable export | Signed public-record export and import preview | Export is author-triggered and contains only a declared public envelope. |
| Level 3: Named relay pilot | Distribute specific public envelopes to selected relays | No automatic relay posting; no relay access to private data. |
| Level 4: Cross-network threads | Display imported external references with clear origin labels | External material is labeled as external; ROOT does not certify it. |

## Human Governance and Safety

The system needs durable review paths before it adds scale. A correction request should be visible to the author and, where appropriate, a named review role. Emergency, violent, exploitative, or otherwise high-risk content requires a defined escalation path, age-appropriate controls, and legal-policy review before any unrestricted distribution mode is enabled. Safety controls must act on published content and declared distribution—not on secret behavioral profiling.

The Directory Steward role is deliberately not a Truth Talk adjudicator. Its authority is limited to reviewed service and emergency directories plus Project Reclaim source review within the assigned scope. Truth Talk review authority, if later introduced, must be a separate narrowly defined role with its own evidence threshold, review clock, appeal route, and revocation control.

## Build Sequence

| Phase | Deliverable | Completion standard |
|---|---|---|
| 1 | Finish the existing swipe feed and Source Room detail route | No fabricated feed material; every record keeps current TruthOK semantics. |
| 2 | Add correction, challenge, and source-attachment records | Every amendment links to its parent and preserves a readable history. |
| 3 | Add typed Civic Thread responses and explicit sort or filter controls | No global reputation score; response type and evidence route are visible. |
| 4 | Add member-controlled media upload references and access grants | Media storage and access use explicit consent with no persistent behavioral tracking. |
| 5 | Publish a portable public-record envelope specification | A security and privacy review approves the exact exported fields. |
| 6 | Pilot named-relay distribution for opted-in public envelopes | Each distribution grant is explicit, revocable where feasible, and auditable. |

## What “Good Like TikTok, YouTube, Reddit, and Nostr” Means Here

It means **fast discovery, expressive media, deep context, participatory threads, and portable identity**—not surveillance advertising, hidden ranking systems, synthetic consensus, or a platform declaring itself the final judge of reality. Truth Talk should earn trust by making its limits visible and its records inspectable.

The immediate next product decision is whether to build **Source Room and correction history** first, or **typed Civic Threads** first. Source Room strengthens the quality of each individual declaration; Civic Threads strengthens the quality of the public conversation around it. The recommended order is Source Room and corrections first, then typed threads, because a durable source and correction model gives later conversation a more reliable foundation.
