# ROOT Issuer and Directory Policy

The **Issuer workspace** is restricted to ROOT administrators. It is the only product surface that can issue an attestation or create a service or emergency-resource directory record. Member profiles remain private by default; an issuer identifies a member by their private ROOT member code and does not gain general profile visibility.

An attestation records its issuer label, issuer kind, declared scope, evidence status, issuance date, and revocation or dispute state. It is not a universal reputation score and does not automatically grant access to every service.

Service and emergency-resource directories start empty. ROOT does not seed fictional providers, unverified organizations, or sample emergency contacts. An administrator must provide a public verification source URL before publication and explicitly decide whether a record is published. Emergency resources continue to use member location only for the current lookup and never store a member location history.

The administrator interface is an operational tool, not a claim that a provider has been endorsed beyond the specific source and verification date supplied by the administrator. Records should be periodically rechecked and unpublished when their source cannot be verified.
