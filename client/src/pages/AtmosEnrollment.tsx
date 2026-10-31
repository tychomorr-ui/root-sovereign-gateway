import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  Radio,
  FileCheck2,
  Bell,
  Globe2,
  Upload,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ATMOS_NODE_CATALOG } from "@shared/atmos";

export default function AtmosEnrollment() {
  const me = trpc.auth.me.useQuery();
  const operators = trpc.root.issuer.operators.list.useQuery(undefined, {
    enabled: Boolean(me.data),
  });
  const enrollments = trpc.root.issuer.atmos.enrollments.useQuery(undefined, {
    enabled: Boolean(operators.data?.length),
  });
  const receipts = trpc.root.issuer.atmos.receipts.useQuery(undefined, {
    enabled: Boolean(operators.data?.length),
  });
  const archangelContract = trpc.root.issuer.atmos.archangel.contract.useQuery(
    undefined,
    { enabled: Boolean(operators.data?.length) }
  );
  const archangelReceipts = trpc.root.issuer.atmos.archangel.receipts.useQuery(
    undefined,
    { enabled: Boolean(operators.data?.length) }
  );
  const audit = trpc.root.issuer.atmos.audit.useQuery(undefined, {
    enabled: Boolean(operators.data?.length),
  });
  const alerts = trpc.root.issuer.atmos.alerts.useQuery(undefined, {
    enabled: Boolean(operators.data?.length),
  });
  const connections = trpc.root.issuer.atmos.truthTalk.connections.useQuery(
    undefined,
    { enabled: Boolean(operators.data?.length) }
  );
  const utils = trpc.useUtils();
  const [nodeId, setNodeId] = useState("root-gate");
  const selected =
    ATMOS_NODE_CATALOG.find(node => node.nodeId === nodeId) ??
    ATMOS_NODE_CATALOG[0];
  const [displayName, setDisplayName] = useState<string>(selected.displayName);
  const [endpointUrl, setEndpointUrl] = useState("");
  const [publicKeyPem, setPublicKeyPem] = useState("");
  const [truthLabel, setTruthLabel] = useState("");
  const [truthOriginUrl, setTruthOriginUrl] = useState("");
  const [truthFeedUrl, setTruthFeedUrl] = useState("");
  const [truthPublicKeyPem, setTruthPublicKeyPem] = useState("");
  const [archangelReceiptJson, setArchangelReceiptJson] = useState("");
  const register = trpc.root.issuer.atmos.register.useMutation({
    onSuccess: () => {
      void utils.root.issuer.atmos.enrollments.invalidate();
      void utils.root.issuer.atmos.audit.invalidate();
      setEndpointUrl("");
      setPublicKeyPem("");
      toast.success(
        "Node registration saved. It remains pending until its runtime submits a real signed receipt."
      );
    },
  });
  const scanAlerts = trpc.root.issuer.atmos.scanAlerts.useMutation({
    onSuccess: () => void utils.root.issuer.atmos.alerts.invalidate(),
  });
  const acknowledgeAlert = trpc.root.issuer.atmos.acknowledgeAlert.useMutation({
    onSuccess: () => void utils.root.issuer.atmos.alerts.invalidate(),
  });
  const importArchangelReceipt =
    trpc.root.issuer.atmos.archangel.import.useMutation({
      onSuccess: data => {
        void utils.root.issuer.atmos.archangel.receipts.invalidate();
        setArchangelReceiptJson("");
        toast.success(`ARCHANGEL receipt imported: ${data.receiptHash}`);
      },
      onError: error => toast.error(error.message),
    });
  const registerTruthTalk =
    trpc.root.issuer.atmos.truthTalk.register.useMutation({
      onSuccess: () => {
        void utils.root.issuer.atmos.truthTalk.connections.invalidate();
        setTruthLabel("");
        setTruthOriginUrl("");
        setTruthFeedUrl("");
        setTruthPublicKeyPem("");
        toast.success(
          "Truth Talk connection saved as pending public-read-only; ROOT will not ingest or publish remote claims automatically."
        );
      },
    });
  if (me.isLoading || (me.data && operators.isLoading))
    return (
      <main className="grid min-h-screen place-items-center bg-[#0b1110] text-white">
        <div className="motion-skeleton h-10 w-10 rounded-full" />
      </main>
    );
  if (!me.data)
    return (
      <Gate
        title="Sign in to continue"
        body="ARCHANGEL enrollment is restricted to the authenticated First Executive workspace."
        action="Open ROOT"
        href="/"
      />
    );
  if (operators.isError || !operators.data?.length)
    return (
      <Gate
        title="First Executive authority required"
        body="Registration changes are private governance actions. No node is verified from this screen until a real runtime receipt is accepted."
        action="Back to issuer workspace"
        href="/issuer"
      />
    );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    register.mutate({
      nodeId,
      displayName,
      endpointUrl,
      publicKeyPem,
      approvedScope: "read:health",
    });
  };
  const submitTruthTalk = (event: FormEvent) => {
    event.preventDefault();
    registerTruthTalk.mutate({
      label: truthLabel,
      originUrl: truthOriginUrl,
      feedUrl: truthFeedUrl,
      publicKeyPem: truthPublicKeyPem || undefined,
    });
  };
  const submitArchangelReceipt = (event: FormEvent) => {
    event.preventDefault();
    try {
      importArchangelReceipt.mutate(JSON.parse(archangelReceiptJson));
    } catch {
      toast.error("Paste one valid signed ARCHANGEL receipt JSON object.");
    }
  };
  const enrollmentById = new Map(
    (enrollments.data ?? []).map(item => [item.nodeId, item])
  );
  return (
    <div className="min-h-screen bg-[#f5f7f2] text-[#18211c]">
      <header className="border-b border-[#dfe4dc] bg-white/90 px-5 py-4 backdrop-blur lg:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <Link href="/issuer" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b7ed55] font-serif text-lg font-bold">
              R
            </span>
            <span className="font-serif text-xl">ROOT</span>
            <span className="hidden text-[10px] font-bold tracking-[.16em] text-[#647064] sm:inline">
              ARCHANGEL ENROLLMENT
            </span>
          </Link>
          <Link href="/issuer">
            <Button
              variant="outline"
              className="rounded-full border-[#cbd3c9] bg-white text-xs"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Issuer workspace
            </Button>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8 lg:py-10">
        <section className="grid gap-6 rounded-[2rem] bg-[#18211c] p-7 lg:grid-cols-[1fr_.8fr] lg:p-10">
          <div>
            <p className="eyebrow text-[#b7ed55]">SIGNED STATUS ENROLLMENT</p>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
              Verify the runtime, not the URL.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white">
              ARCHANGEL stores only a node public key, endpoint, and bounded
              scope. A node becomes verified only after its own runtime signs a
              fresh five-minute challenge.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.05] p-5 text-white">
            <ShieldCheck className="h-6 w-6 text-[#b7ed55]" />
            <p className="mt-4 text-sm font-semibold">No remote execution</p>
            <p className="mt-1 text-xs leading-5 text-[#c1cdc0]">
              This contract does not grant SSH, shell, firewall, deploy, mesh
              activation, or arbitrary command authority.
            </p>
          </div>
        </section>
        <section className="mt-7 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={submit} className="panel p-6">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-[#5d8330]" />
              <h2 className="font-serif text-2xl">
                Register a node public key
              </h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#647064]">
              Register the exact node ID, its real endpoint, and the public
              Ed25519 PEM. Never paste a private key.
            </p>
            <label className="field-label mt-5">Exact node ID</label>
            <select
              value={nodeId}
              onChange={event => {
                const next = event.target.value;
                setNodeId(next);
                const item = ATMOS_NODE_CATALOG.find(
                  node => node.nodeId === next
                );
                if (item) setDisplayName(item.displayName);
              }}
              className="field-input mt-2"
            >
              {ATMOS_NODE_CATALOG.filter(node => node.enrollable).map(node => (
                <option key={node.nodeId} value={node.nodeId}>
                  {node.nodeId} · {node.displayName}
                </option>
              ))}
            </select>
            <label className="mt-4 block">
              <span className="field-label">Display name</span>
              <input
                value={displayName}
                onChange={event => setDisplayName(event.target.value)}
                className="field-input mt-2"
                required
              />
            </label>
            <label className="mt-4 block">
              <span className="field-label">Real public endpoint</span>
              <input
                type="url"
                value={endpointUrl}
                onChange={event => setEndpointUrl(event.target.value)}
                placeholder="https://node.example"
                className="field-input mt-2"
                required
              />
            </label>
            <label className="mt-4 block">
              <span className="field-label">Public Ed25519 PEM</span>
              <textarea
                value={publicKeyPem}
                onChange={event => setPublicKeyPem(event.target.value)}
                placeholder="-----BEGIN PUBLIC KEY-----"
                className="field-input mt-2 min-h-44 resize-y font-mono text-xs"
                required
              />
            </label>
            <div className="mt-5 rounded-xl bg-[#f2f4ef] p-4 text-xs leading-5 text-[#536253]">
              <p className="font-bold text-[#344334]">Approved scope</p>
              <p className="mt-1 font-mono">read:health</p>
              <p className="mt-2">
                The runtime must report{" "}
                <span className="font-mono">health.check</span>. Registration
                alone never creates verification evidence.
              </p>
            </div>
            <Button
              disabled={register.isPending || !selected.enrollable}
              type="submit"
              className="mt-5 w-full rounded-xl bg-[#18211c] text-white hover:bg-[#293b2e]"
            >
              {register.isPending
                ? "Saving registration…"
                : "Register public key"}
            </Button>
          </form>
          <section className="space-y-5">
            <div className="panel overflow-hidden">
              <div className="border-b border-[#dfe4dc] p-6">
                <div className="flex items-center gap-3">
                  <Radio className="h-5 w-5 text-[#5d8330]" />
                  <div>
                    <h2 className="font-serif text-2xl">Node matrix</h2>
                    <p className="mt-1 text-sm text-[#687468]">
                      Pending means registered or declared, not verified.
                    </p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-[#dfe4dc]">
                {ATMOS_NODE_CATALOG.map(node => {
                  const record = enrollmentById.get(node.nodeId);
                  const status = record?.verificationState ?? node.posture;
                  return (
                    <div key={node.nodeId} className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {node.nodeId} · {node.displayName}
                          </p>
                          <p className="mt-1 text-xs text-[#687468]">
                            {record
                              ? `${record.endpointUrl} · scope ${record.approvedScope}`
                              : node.enrollable
                                ? "Public key not registered"
                                : "Physical host unplaced; do not enroll"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[.08em] ${status === "verified" || status === "verified_reference" ? "bg-[#e8f6c8] text-[#4a642a]" : "bg-[#edf0ea] text-[#667365]"}`}
                        >
                          {status}
                        </span>
                      </div>
                      {record && (
                        <p className="mt-3 text-xs text-[#687468]">
                          Fingerprint{" "}
                          <span className="font-mono">
                            {record.publicKeyFingerprint}
                          </span>{" "}
                          · last receipt {record.lastReceiptHash || "—"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="panel overflow-hidden">
              <div className="border-b border-[#dfe4dc] p-6">
                <div className="flex items-center gap-3">
                  <Upload className="h-5 w-5 text-[#5d8330]" />
                  <div>
                    <h2 className="font-serif text-2xl">Import signed ARCHANGEL receipt</h2>
                    <p className="mt-1 text-sm text-[#687468]">
                      {archangelContract.data?.status === "configured"
                        ? `Pinned Ed25519 trust root · ${archangelContract.data.authorityFingerprint}`
                        : "Trust root not configured; imports fail closed until the public key is pinned."}
                    </p>
                  </div>
                </div>
              </div>
              <form onSubmit={submitArchangelReceipt} className="space-y-4 p-6">
                <p className="text-xs leading-5 text-[#687468]">
                  Contract: <span className="font-mono">ARCHANGEL/v0</span> · signs <span className="font-mono">payload_cid|ts</span> with the pinned Ed25519 key. This is a signed node-status observation only; it does not grant service authority, publish Truth Talk claims, or mark a node verified outside ROOT’s receipt ledger.
                </p>
                <textarea
                  value={archangelReceiptJson}
                  onChange={event => setArchangelReceiptJson(event.target.value)}
                  className="field-input min-h-44 resize-y font-mono text-xs"
                  placeholder="Paste the complete signed receipt JSON object here."
                  required
                />
                <Button
                  type="submit"
                  disabled={importArchangelReceipt.isPending || archangelContract.data?.status !== "configured"}
                  className="rounded-xl bg-[#18211c] text-white hover:bg-[#293b2e]"
                >
                  {importArchangelReceipt.isPending ? "Verifying signature…" : "Verify and import receipt"}
                </Button>
              </form>
              {archangelReceipts.data?.length ? (
                <div className="divide-y divide-[#dfe4dc] border-t border-[#dfe4dc]">
                  {archangelReceipts.data.slice(0, 8).map(receipt => (
                    <div key={receipt.id} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{receipt.nodeId} · {receipt.receiptId}</p>
                          <p className="mt-1 text-xs text-[#687468]">
                            {receipt.nodeStatus} · observed {new Date(receipt.observedAt).toLocaleString()}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#e8f6c8] px-2.5 py-1 text-[10px] font-bold text-[#4a642a]">SIGNED</span>
                      </div>
                      <p className="mt-3 break-all font-mono text-[10px] text-[#687468]">{receipt.receiptHash}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="panel overflow-hidden">
              <div className="border-b border-[#dfe4dc] p-6">
                <div className="flex items-center gap-3">
                  <FileCheck2 className="h-5 w-5 text-[#5d8330]" />
                  <div>
                    <h2 className="font-serif text-2xl">Accepted receipts</h2>
                    <p className="mt-1 text-sm text-[#687468]">
                      Durable evidence is created only by a verified signature.
                    </p>
                  </div>
                </div>
              </div>
              {receipts.data?.length ? (
                <div className="divide-y divide-[#dfe4dc]">
                  {receipts.data.slice(0, 12).map(receipt => (
                    <div key={receipt.id} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {receipt.nodeId} · {receipt.nodeVersion}
                          </p>
                          <p className="mt-1 text-xs text-[#687468]">
                            {receipt.nodeStatus} ·{" "}
                            {new Date(receipt.verifiedAt).toLocaleString()}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#e8f6c8] px-2.5 py-1 text-[10px] font-bold text-[#4a642a]">
                          VERIFIED
                        </span>
                      </div>
                      <p className="mt-3 break-all font-mono text-[10px] text-[#687468]">
                        {receipt.receiptHash}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-[#687468]">
                  No signed receipts accepted yet.
                </div>
              )}
            </div>
            <div className="panel overflow-hidden">
              <div className="border-b border-[#dfe4dc] p-6">
                <h2 className="font-serif text-2xl">Enrollment audit</h2>
                <p className="mt-1 text-sm text-[#687468]">
                  Registrations, challenges, rejections, and accepted receipts
                  remain append-only evidence.
                </p>
              </div>
              {audit.data?.length ? (
                <div className="divide-y divide-[#dfe4dc]">
                  {audit.data.slice(0, 12).map(item => (
                    <div key={item.id} className="p-4 text-sm">
                      <div className="flex justify-between gap-3">
                        <p className="font-medium">
                          {item.nodeId} · {item.action}
                        </p>
                        <p className="text-xs text-[#687468]">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-[#687468]">
                        {item.details}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-[#687468]">
                  No enrollment events recorded.
                </div>
              )}
            </div>
          </section>
          <section className="mt-7 grid gap-6 lg:grid-cols-2">
            <div className="panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-[#5d8330]" />
                  <div>
                    <h2 className="font-serif text-2xl">Receipt monitoring</h2>
                    <p className="mt-1 text-sm text-[#687468]">
                      Warning at four minutes; critical after five. The scan is
                      idempotent and creates no telemetry.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => scanAlerts.mutate()}
                  disabled={scanAlerts.isPending}
                  className="rounded-full border-[#cbd3c9] bg-white text-xs"
                >
                  {scanAlerts.isPending ? "Scanning…" : "Run scan"}
                </Button>
              </div>
              {alerts.data?.length ? (
                <div className="mt-5 space-y-3">
                  {alerts.data.slice(0, 8).map(alert => (
                    <div
                      key={alert.id}
                      className="rounded-xl border border-[#dfe4dc] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {alert.nodeId} ·{" "}
                            {alert.alertType.replaceAll("_", " ")}
                          </p>
                          <p className="mt-1 text-xs text-[#687468]">
                            {alert.details}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${alert.severity === "critical" ? "bg-[#ffe2dc] text-[#9d3b2d]" : "bg-[#fff1c7] text-[#85650d]"}`}
                        >
                          {alert.status}
                        </span>
                      </div>
                      {alert.status === "open" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            acknowledgeAlert.mutate({ alertId: alert.id })
                          }
                          className="mt-3 rounded-full border-[#cbd3c9] bg-white text-xs"
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm text-[#687468]">
                  No open or historical receipt alerts.
                </p>
              )}
            </div>
            <form onSubmit={submitTruthTalk} className="panel p-6">
              <div className="flex items-center gap-3">
                <Globe2 className="h-5 w-5 text-[#5d8330]" />
                <div>
                  <h2 className="font-serif text-2xl">Truth Talk network</h2>
                  <p className="mt-1 text-sm text-[#687468]">
                    Register your separate Truth Talk origin as a pending,
                    public-read-only connection.
                  </p>
                </div>
              </div>
              <label className="mt-5 block">
                <span className="field-label">Network label</span>
                <input
                  value={truthLabel}
                  onChange={event => setTruthLabel(event.target.value)}
                  className="field-input mt-2"
                  placeholder="Truth Talk Network"
                  required
                />
              </label>
              <label className="mt-4 block">
                <span className="field-label">Canonical origin URL</span>
                <input
                  type="url"
                  value={truthOriginUrl}
                  onChange={event => setTruthOriginUrl(event.target.value)}
                  className="field-input mt-2"
                  placeholder="https://truth.example"
                  required
                />
              </label>
              <label className="mt-4 block">
                <span className="field-label">Public feed URL</span>
                <input
                  type="url"
                  value={truthFeedUrl}
                  onChange={event => setTruthFeedUrl(event.target.value)}
                  className="field-input mt-2"
                  placeholder="https://truth.example/feed"
                  required
                />
              </label>
              <label className="mt-4 block">
                <span className="field-label">
                  Optional network Ed25519 PEM
                </span>
                <textarea
                  value={truthPublicKeyPem}
                  onChange={event => setTruthPublicKeyPem(event.target.value)}
                  className="field-input mt-2 min-h-32 resize-y font-mono text-xs"
                  placeholder="Provide this before activation for signed federation."
                />
              </label>
              <div className="mt-4 rounded-xl bg-[#f2f4ef] p-4 text-xs leading-5 text-[#536253]">
                ROOT will not scrape, republish, rank, or silently ingest remote
                claims. Activation requires a real canonical origin, a signed
                feed contract, and explicit First Executive review.
              </div>
              <Button
                disabled={registerTruthTalk.isPending}
                type="submit"
                className="mt-5 w-full rounded-xl bg-[#18211c] text-white hover:bg-[#293b2e]"
              >
                {registerTruthTalk.isPending
                  ? "Saving connection…"
                  : "Save pending connection"}
              </Button>
              {connections.data?.length ? (
                <div className="mt-5 space-y-2">
                  {connections.data.map(connection => (
                    <div
                      key={connection.id}
                      className="rounded-xl border border-[#dfe4dc] p-3 text-xs"
                    >
                      <div className="flex justify-between gap-3">
                        <p className="font-medium">{connection.label}</p>
                        <span className="rounded-full bg-[#edf0ea] px-2 py-1 text-[10px] font-bold">
                          {connection.status}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[#687468]">
                        {connection.originUrl}
                      </p>
                      <p className="mt-1 text-[#687468]">
                        scope: {connection.scope}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </form>
          </section>
        </section>
      </main>
    </div>
  );
}

function Gate({
  title,
  body,
  action,
  href,
}: {
  title: string;
  body: string;
  action: string;
  href: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0b1110] p-5 text-[#eef4ed]">
      <div className="motion-enter max-w-md rounded-[2rem] border border-white/10 bg-white/[.04] p-9 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-[#b7ed55]" />
        <h1 className="mt-5 font-serif text-3xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#b6c4b6]">{body}</p>
        <Link href={href}>
          <Button className="mt-7 rounded-full bg-[#b7ed55] text-[#172019] hover:bg-[#c9fb71]">
            {action}
          </Button>
        </Link>
      </div>
    </main>
  );
}
