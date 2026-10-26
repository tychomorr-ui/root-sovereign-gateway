#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { sign } from "node:crypto";

const [baseUrl, nodeId, nodeVersion, status, capabilitiesArg] = process.argv.slice(2);
const privateKeyFile = process.env.ATMOS_NODE_PRIVATE_KEY_FILE;
const allowedStatuses = new Set(["ok", "degraded", "not_ready"]);

if (!baseUrl || !nodeId || !nodeVersion || !status || !capabilitiesArg || !privateKeyFile) {
  console.error("Usage: ATMOS_NODE_PRIVATE_KEY_FILE=/path/key.pem node submit-atmos-node-receipt.mjs BASE_URL NODE_ID NODE_VERSION STATUS CAPABILITIES");
  process.exit(2);
}
if (!allowedStatuses.has(status)) {
  console.error("STATUS must be ok, degraded, or not_ready.");
  process.exit(2);
}
const capabilities = capabilitiesArg.split(",").map(value => value.trim()).filter(Boolean).sort();
if (!capabilities.includes("health.check")) {
  console.error("CAPABILITIES must include health.check.");
  process.exit(2);
}

const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/atmos/nodes/${encodeURIComponent(nodeId)}/challenge`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
const challenge = await response.json();
if (!response.ok) {
  console.error(JSON.stringify(challenge));
  process.exit(1);
}

const payload = {
  nodeId,
  challengeId: challenge.challengeId,
  nonce: challenge.nonce,
  issuedAt: challenge.issuedAt,
  expiresAt: challenge.expiresAt,
  nodeVersion,
  status,
  capabilities,
};
const canonicalPayload = JSON.stringify(payload);
const privateKey = await readFile(privateKeyFile, "utf8");
const signature = sign(null, Buffer.from(canonicalPayload), privateKey).toString("base64url");
const receiptResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/atmos/nodes/${encodeURIComponent(nodeId)}/receipt`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ ...payload, signature }),
});
const receipt = await receiptResponse.json();
if (!receiptResponse.ok) {
  console.error(JSON.stringify(receipt));
  process.exit(1);
}
console.log(JSON.stringify({ ...receipt, signature: "[redacted]" }, null, 2));
