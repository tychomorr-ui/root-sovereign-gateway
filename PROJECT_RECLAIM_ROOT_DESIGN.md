# Project Reclaim in ROOT

**Program position:** Project Reclaim is a ROOT program for voluntary human restoration, not an employer, government agency, benefits administrator, clinician, background-check system, or surveillance layer.

## Recommended Sovereign Identity Model

ROOT should retain the current **single-account model**. The existing business account remains the accountable First Executive. The owner’s new personal ROOT code is a private identity reference and does not create another login or operator principal. A truly separate operator principal should be introduced only when a different account holder needs independently revocable authority, a separate consent boundary, or a distinct audit trail. Creating a second role for the same account would obscure rather than strengthen accountability.

## Program Boundary

The Project Reclaim white paper identifies Health, Housing, Work, Education, Community, and Independence as its organizing pillars. ROOT will implement these as a **source-governed navigator** rather than an automated case-management system. A member may privately record interest in a Project Reclaim resource or opportunity; ROOT will not send that information anywhere automatically. A later referral or introduction requires a separate, explicit consent grant naming the recipient, purpose, and fields.

| Surface | What ROOT may do | What ROOT must not do |
| --- | --- | --- |
| Public source registry | Publish reviewed first-party sources, their regional scope, a pillar, source URL, availability note, verification date, and review due date. | Assert partnership, employment placement, program eligibility, availability, acceptance, or outcome. |
| Private member interest ledger | Let a member privately mark a source as worth exploring and optionally write a private note. | Disclose interest, notes, personal records, or location to a provider, employer, county agency, or other member. |
| First Executive review | Create, publish, unpublish, and review source records with a decision trace. | Manufacture roles, contacts, listings, or regional coverage without primary-source evidence. |
| Regional stewardship | Publish a record only under an active reviewed node assigned to the source’s region. | Treat a planned node or a non-local label as operational coverage. |

## Rollout

The first public Project Reclaim pilot is **Mendocino County under active A1**. Two official sources are appropriate for carefully labeled public-source entries: CalWORKs Job Services and the Community Development Commission of Mendocino County. The former describes employment and training support and related participation assistance for eligible recipients; the latter is the local public housing authority and describes rental assistance and housing programs. [1] [2]

**Lake County is included immediately as a verified internal-source watchlist, not as claimed public coverage.** Its official housing page says the Housing Choice Voucher waiting list is closed and the Emergency Housing Voucher program is no longer accepting applications. [3] Its official Behavioral Health page includes a careers reference and regional Continuum of Care context, but ROOT should not infer an employment, health, or referral partnership. [4] Lake County records become public only after an active reviewed Lake County node or an explicitly broadened regional mandate exists.

## Data Model

| Record | Visibility | Required controls |
| --- | --- | --- |
| `project_reclaim_sources` | Public only when published; otherwise First Executive only. | Pillar, county, source URL, availability note, verified and review dates, publication state, and responsible active node. |
| `project_reclaim_interests` | Owner only. | Owner ID, source ID, optional private note, and no external delivery mechanism. |
| `project_reclaim_audits` | First Executive only. | Actor, action, source, details, and timestamp for creation, publication, review, or unpublication. |

## Initial Source Posture

| County | Pillar | Source | ROOT status |
| --- | --- | --- | --- |
| Mendocino | Work | CalWORKs Job Services | Candidate for A1-reviewed public source entry. |
| Mendocino | Housing | Community Development Commission of Mendocino County | Candidate for A1-reviewed public source entry. |
| Lake | Housing | Lake County Housing | Verified internal watchlist; current official page states key voucher pathways are closed. |
| Lake | Health / Work | Lake County Behavioral Health Services and its public careers link | Verified internal watchlist; requires a Lake County active-node review before public-source publication. |

## Non-Negotiable Safeguards

Project Reclaim in ROOT uses **no behavioral tracking, no participant scoring, no compelled disclosure, no persistent location data, no sale of participant or worker data, and no automated benefits, hiring, housing, clinical, or enforcement decision**. All external references are clearly source-linked; written authorization is required before a provider or employer is called a Project Reclaim or ROOT partner.

## References

[1]: https://www.mendocinocounty.gov/departments/social-services/employment-family-assistance-services/calworks-job-services "Mendocino County CalWORKs Job Services"
[2]: https://www.cdchousing.org/ "Community Development Commission of Mendocino County"
[3]: https://www.lakecountyca.gov/808/Housing "Lake County Housing"
[4]: https://lcbh.lakecountyca.gov/173/Behavioral-Health-Services "Lake County Behavioral Health Services"
