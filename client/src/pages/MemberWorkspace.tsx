import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CLAIM_TYPES, deriveFileIntegrityDigest, EMERGENCY_PRIVACY_NOTICE, TRUTH_OK_SIGNAL_LABELS } from "@shared/root";
import { ChevronRight, CircleAlert, ClipboardCheck, Download, FileKey2, HeartHandshake, KeyRound, Loader2, MapPinned, Plus, ShieldCheck, UserRoundCheck, X } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type WorkspaceSection = "profile" | "permissions" | "record" | "talk" | "vouches" | "services" | "emergency";

const NAV: Array<{ id: WorkspaceSection; label: string; icon: typeof UserRoundCheck }> = [
  { id: "profile", label: "Identity", icon: UserRoundCheck },
  { id: "permissions", label: "Permissions", icon: KeyRound },
  { id: "record", label: "Member record", icon: ClipboardCheck },
  { id: "talk", label: "Truth Talk", icon: FileKey2 },
  { id: "vouches", label: "Scoped vouches", icon: HeartHandshake },
  { id: "services", label: "Services", icon: ShieldCheck },
  { id: "emergency", label: "Emergency", icon: CircleAlert },
];

function prettyClaimType(value: string) {
  return value === "firsthand_account" ? "firsthand account" : value;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function MemberWorkspace() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [active, setActive] = useState<WorkspaceSection>("profile");

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-[#0b1110] text-[#e6efe8]"><Loader2 className="animate-spin" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#0b1110] px-6 py-10 text-[#e6efe8]">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center shadow-2xl shadow-black/30 sm:p-12">
          <div className="mx-auto mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#b7ed55] text-[#0b1110]"><KeyRound className="h-6 w-6" /></div>
          <p className="eyebrow">ROOT MEMBER GATEWAY</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight">Your record stays yours.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#b6c3b9]">Sign in to manage your identity, permissions, proofs, and participation. ROOT does not create a public profile for you by default.</p>
          <Button onClick={startLogin} className="mt-8 h-11 rounded-full bg-[#b7ed55] px-6 font-semibold text-[#0b1110] hover:bg-[#c9fb71]">Sign in to ROOT <ChevronRight className="ml-1 h-4 w-4" /></Button>
          <button onClick={() => setLocation("/")} className="mt-6 block w-full text-sm text-[#b7ed55] underline-offset-4 hover:underline">Return to the public gateway</button>
        </div>
      </main>
    );
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-[#eff1eb] text-[#172019]">
      <header className="sticky top-0 z-30 border-b border-[#d9ddd4] bg-[#eff1eb]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 lg:px-8">
          <Link href="/" className="group flex items-center gap-3"><RootGlyph /><span className="font-serif text-xl tracking-tight">ROOT</span><span className="hidden text-[10px] font-bold tracking-[0.18em] text-[#6a7469] sm:inline">MEMBER GATEWAY</span></Link>
          <div className="flex items-center gap-3 text-sm">{user?.role === "admin" && <Link href="/issuer"><Button variant="outline" className="hidden h-9 rounded-full border-[#b6cd94] bg-[#f3f9e9] px-4 text-xs text-[#3e5a27] sm:inline-flex">Issuer workspace</Button></Link>}<span className="hidden text-[#657064] sm:inline">{user?.name || "Member"}</span><Button variant="outline" onClick={handleLogout} className="h-9 rounded-full border-[#cbd1c5] bg-transparent px-4 text-xs">Sign out</Button></div>
        </div>
      </header>
      <main className="mx-auto grid max-w-[1440px] lg:grid-cols-[260px_1fr]">
        <aside className="min-w-0 border-b border-[#d9ddd4] bg-[#e6eae1] px-4 py-5 lg:min-h-[calc(100vh-64px)] lg:border-b-0 lg:border-r lg:px-5 lg:py-8">
          <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.16em] text-[#667064]">YOUR ROOT</p>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {NAV.map(item => {
              const Icon = item.icon;
              return <button key={item.id} onClick={() => setActive(item.id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active === item.id ? "bg-[#18211c] text-white shadow-lg shadow-[#1c2b20]/10" : "text-[#536052] hover:bg-white/60 hover:text-[#172019]"}`}><Icon className="h-4 w-4" />{item.label}</button>;
            })}
          </nav>
          <div className="mt-7 hidden rounded-2xl border border-[#ccd2c8] bg-white/50 p-4 lg:block"><p className="text-xs font-semibold">Private by default</p><p className="mt-2 text-xs leading-5 text-[#667064]">Nothing in your member record is shared unless you issue a scoped grant.</p></div>
        </aside>
        <section className="min-w-0 p-5 sm:p-8 lg:p-10">
          {active === "profile" && <ProfilePanel />}
          {active === "permissions" && <PermissionsPanel />}
          {active === "record" && <RecordPanel />}
          {active === "talk" && <TruthTalkPanel />}
          {active === "vouches" && <VouchesPanel />}
          {active === "services" && <ServicesPanel />}
          {active === "emergency" && <EmergencyPanel />}
        </section>
      </main>
    </div>
  );
}

function RootGlyph() {
  return <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#b7ed55] font-serif text-lg font-bold text-[#172019]">R</span>;
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <div className="mb-8 max-w-3xl"><p className="eyebrow text-[#60725e]">{eyebrow}</p><h1 className="mt-3 font-serif text-3xl tracking-tight text-[#172019] sm:text-4xl">{title}</h1><p className="mt-3 text-sm leading-6 text-[#647064]">{children}</p></div>;
}

function ProfilePanel() {
  const utils = trpc.useUtils();
  const profile = trpc.root.profile.get.useQuery();
  const [name, setName] = useState("");
  const update = trpc.root.profile.update.useMutation({ onSuccess: () => { utils.root.profile.get.invalidate(); toast.success("Display name updated."); } });
  const exportData = trpc.root.profile.requestExport.useMutation({ onSuccess: data => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "root-member-export.json"; link.click(); URL.revokeObjectURL(url); toast.success("Your ROOT export has been prepared."); } });
  const deletion = trpc.root.profile.requestDeletion.useMutation({ onSuccess: () => toast.success("Deletion request recorded. Your data remains private while it is processed.") });

  if (profile.isLoading) return <PanelLoading />;
  if (profile.error) return <PanelError />;
  const member = profile.data;
  const currentName = name || member?.displayName || "";

  return <>
    <SectionHeading eyebrow="MEMBER IDENTITY" title="The member controls the record.">ROOT creates a private member record after you sign in. Your public display name, if you choose one, does not expose your underlying account details.</SectionHeading>
    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <section className="panel p-6"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-bold tracking-[0.12em] text-[#6d786b]">YOUR MEMBER CODE</p><p className="mt-2 font-mono text-sm text-[#1b261d]">{member?.memberCode}</p></div><span className="rounded-full bg-[#e8f6c8] px-3 py-1 text-xs font-semibold text-[#3b5522]">{member?.verificationLevel?.replaceAll("-", " ")}</span></div><div className="mt-8 border-t border-[#dfe4dc] pt-6"><label className="field-label" htmlFor="display-name">Display name</label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input id="display-name" value={currentName} onChange={event => setName(event.target.value)} placeholder="Choose a name for ROOT" className="field-input flex-1" /><Button disabled={update.isPending} onClick={() => update.mutate({ displayName: currentName.trim() || null })} className="rounded-xl bg-[#18211c] text-white hover:bg-[#25362a]">Save identity</Button></div><p className="mt-3 text-xs leading-5 text-[#6b746b]">Use a name you are comfortable displaying with posts you publish. Your member record remains private by default.</p></div></section>
      <section className="rounded-[1.5rem] bg-[#18211c] p-6 text-[#e9f0e8]"><ShieldCheck className="h-6 w-6 text-[#b7ed55]" /><h2 className="mt-5 font-serif text-2xl">Your privacy posture</h2><p className="mt-3 text-sm leading-6 text-[#b8c3b9]">ROOT does not share your profile, evidence, vouches, or record details without an explicit grant from you.</p><div className="mt-6 rounded-xl border border-white/10 bg-white/[0.05] p-4"><p className="text-xs font-bold tracking-[0.12em] text-[#b7ed55]">DEFAULT</p><p className="mt-1 text-sm">Private member record</p></div></section>
    </div>
    <section className="panel mt-5 p-6"><div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"><div><h2 className="font-serif text-2xl">Data controls</h2><p className="mt-2 text-sm text-[#647064]">Export your own record or request deletion. ROOT records the request without publishing it.</p></div><div className="flex flex-wrap gap-3"><Button variant="outline" disabled={exportData.isPending} onClick={() => exportData.mutate()} className="rounded-xl border-[#cfd6ca] bg-white"><Download className="mr-2 h-4 w-4" />Export my data</Button><Button variant="outline" disabled={deletion.isPending} onClick={() => { if (window.confirm("Record a deletion request for your ROOT account?")) deletion.mutate(); }} className="rounded-xl border-[#d6b7b1] bg-[#fff7f5] text-[#9e3a2b] hover:bg-[#ffefeb]"><X className="mr-2 h-4 w-4" />Request deletion</Button></div></div></section>
  </>;
}

function PermissionsPanel() {
  const utils = trpc.useUtils();
  const grants = trpc.root.permissions.list.useQuery();
  const [recipientLabel, setRecipientLabel] = useState("");
  const [fields, setFields] = useState("verification level");
  const [purpose, setPurpose] = useState("");
  const [expiry, setExpiry] = useState("");
  const grant = trpc.root.permissions.grant.useMutation({ onSuccess: data => { utils.root.permissions.list.invalidate(); setRecipientLabel(""); setPurpose(""); toast.success("Consent grant issued.", { description: data.receipt }); } });
  const revoke = trpc.root.permissions.revoke.useMutation({ onSuccess: () => { utils.root.permissions.list.invalidate(); toast.success("Consent grant revoked."); } });
  const submit = (event: FormEvent) => { event.preventDefault(); grant.mutate({ recipientLabel, fieldNames: fields.split(",").map(field => field.trim()).filter(Boolean), purpose, expiresAt: expiry ? new Date(`${expiry}T23:59:59`).toISOString() : undefined }); };

  return <>
    <SectionHeading eyebrow="CONSENT LEDGER" title="Grant access with a clear receipt.">Every permission is scoped to named fields and a purpose. You can expire or revoke access from this screen; the recipient sees only what the receipt allows.</SectionHeading>
    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><form onSubmit={submit} className="panel p-6"><h2 className="font-serif text-2xl">New access grant</h2><p className="mt-2 text-sm leading-6 text-[#647064]">Describe the smallest set of fields needed. This is not a blanket profile share.</p><label className="field-label mt-5" htmlFor="recipient">Recipient</label><input id="recipient" required value={recipientLabel} onChange={event => setRecipientLabel(event.target.value)} className="field-input mt-2" placeholder="Named service or verifier" /><label className="field-label mt-4" htmlFor="fields">Permitted fields</label><input id="fields" required value={fields} onChange={event => setFields(event.target.value)} className="field-input mt-2" placeholder="Comma-separated fields" /><label className="field-label mt-4" htmlFor="purpose">Purpose</label><input id="purpose" required value={purpose} onChange={event => setPurpose(event.target.value)} className="field-input mt-2" placeholder="Why this access is needed" /><label className="field-label mt-4" htmlFor="expiry">Expiry (optional)</label><input id="expiry" type="date" value={expiry} onChange={event => setExpiry(event.target.value)} className="field-input mt-2" /><Button type="submit" disabled={grant.isPending} className="mt-6 w-full rounded-xl bg-[#18211c] text-white hover:bg-[#25362a]">Create consent receipt</Button></form>
      <section className="panel overflow-hidden"><div className="border-b border-[#dfe4dc] p-6"><h2 className="font-serif text-2xl">Your grants</h2><p className="mt-2 text-sm text-[#647064]">Active, expired, and revoked records remain visible to you for accountability.</p></div>{grants.isLoading ? <PanelLoading /> : grants.data?.length ? <div className="divide-y divide-[#dfe4dc]">{grants.data.map(item => { const fields = JSON.parse(item.fieldNamesJson) as string[]; return <div key={item.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{item.recipientLabel}</p><p className="mt-1 text-xs text-[#687168]">{item.purpose}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "active" ? "bg-[#e8f6c8] text-[#456028]" : "bg-[#eaebe8] text-[#637063]"}`}>{item.status}</span></div><p className="mt-4 text-sm text-[#303b31]"><span className="font-semibold">Fields:</span> {fields.join(", ")}</p><div className="mt-4 flex items-center justify-between gap-3"><p className="font-mono text-[10px] text-[#718071]">{item.receiptCode}</p>{item.status === "active" && <button onClick={() => revoke.mutate({ grantId: item.id })} className="text-xs font-semibold text-[#9b3d30] hover:underline">Revoke access</button>}</div></div>; })}</div> : <EmptyState icon={<KeyRound />} title="No access grants yet" body="When you choose to share a field with a service or verifier, the receipt will appear here." />}</section></div>
  </>;
}

function RecordPanel() {
  const record = trpc.root.memberRecord.mine.useQuery();
  return <>
    <SectionHeading eyebrow="PRIVATE MEMBER RECORD" title="Issued proofs, plainly presented.">This record is only visible to you. It collects issued attestations, scoped vouches, evidence status, revocation state, and disputes without turning you into a public score.</SectionHeading>
    {record.isLoading ? <PanelLoading /> : <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><section className="panel overflow-hidden"><div className="border-b border-[#dfe4dc] p-6"><h2 className="font-serif text-2xl">Attestations</h2></div>{record.data?.attestations.length ? <div className="divide-y divide-[#dfe4dc]">{record.data.attestations.map(item => <div className="p-5" key={item.id}><div className="flex items-start justify-between gap-4"><div><p className="font-medium">{item.scope}</p><p className="mt-1 text-xs text-[#687168]">Issued by {item.issuerLabel} · {item.issuerKind}</p></div><span className="rounded-full bg-[#edf0ea] px-2.5 py-1 text-xs font-semibold text-[#586657]">{item.status}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><span className="text-[#738072]">Evidence</span><p className="mt-1 font-medium">{item.evidenceStatus}</p></div><div><span className="text-[#738072]">Issued</span><p className="mt-1 font-medium">{formatDate(item.issuedAt)}</p></div></div>{item.disputeSummary && <p className="mt-4 rounded-lg bg-[#fff8e9] p-3 text-xs text-[#765a20]">Dispute: {item.disputeSummary}</p>}</div>)}</div> : <EmptyState icon={<ClipboardCheck />} title="No issued attestations" body="When an authorized issuer records an attestation for you, its scope, issuer, evidence status, and any dispute history will appear here." />}</section>
      <section className="panel overflow-hidden"><div className="border-b border-[#dfe4dc] p-6"><h2 className="font-serif text-2xl">Scoped vouches</h2></div>{record.data?.vouches.length ? <div className="divide-y divide-[#dfe4dc]">{record.data.vouches.map(item => <div className="p-5" key={item.id}><p className="font-medium">{item.scope}</p><p className="mt-1 text-xs text-[#687168]">{item.status} · {formatDate(item.createdAt)}</p></div>)}</div> : <EmptyState icon={<HeartHandshake />} title="No scoped vouches" body="Vouches are limited to a stated scope and require your acceptance. They never become a universal personal score." />}</section></div>}
  </>;
}

function TruthTalkPanel() {
  const utils = trpc.useUtils();
  const posts = trpc.root.truthTalk.mine.useQuery();
  const [claimType, setClaimType] = useState<(typeof CLAIM_TYPES)[number]["value"]>("report");
  const [body, setBody] = useState("");
  const [sources, setSources] = useState("");
  const [evidenceDigest, setEvidenceDigest] = useState("");
  const [visibility, setVisibility] = useState<"public" | "members" | "private">("public");
  const publish = trpc.root.truthTalk.publish.useMutation({ onSuccess: data => { utils.root.truthTalk.mine.invalidate(); utils.root.truthTalk.feed.invalidate(); setBody(""); setSources(""); toast.success("Truth Talk post published.", { description: data.integrityReceipt }); } });
  const withdraw = trpc.root.truthTalk.withdraw.useMutation({ onSuccess: () => { utils.root.truthTalk.mine.invalidate(); utils.root.truthTalk.feed.invalidate(); toast.success("Post withdrawn with history preserved."); } });
  const submit = (event: FormEvent) => { event.preventDefault(); const sourceUrls = sources.split("\n").map(url => url.trim()).filter(Boolean); publish.mutate({ claimType, body, sourceUrls, evidenceDigest: evidenceDigest || undefined, visibility }); };

  return <>
    <SectionHeading eyebrow="TRUTH TALK" title="Publish the claim, show the path to it.">TruthOK displays separate provenance signals. It does not issue a binary verdict about the claim or the person who made it.</SectionHeading>
    <LocalFileDigestControl digest={evidenceDigest} onDigest={setEvidenceDigest} />
    <div className="grid gap-5 2xl:grid-cols-[.82fr_1.18fr]"><form onSubmit={submit} className="panel p-6"><div className="flex items-center justify-between"><h2 className="font-serif text-2xl">New claim</h2><span className="rounded-full bg-[#e8f6c8] px-3 py-1 text-[10px] font-bold tracking-[0.12em] text-[#496129]">PROVENANCE LED</span></div><label className="field-label mt-5" htmlFor="claim-type">Declared claim type</label><select id="claim-type" value={claimType} onChange={event => setClaimType(event.target.value as typeof claimType)} className="field-input mt-2">{CLAIM_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select><label className="field-label mt-4" htmlFor="post-body">Claim</label><textarea id="post-body" required minLength={12} value={body} onChange={event => setBody(event.target.value)} className="field-input mt-2 min-h-36 resize-y" placeholder="Write the statement you want readers to evaluate." /><label className="field-label mt-4" htmlFor="sources">Source URLs</label><textarea id="sources" value={sources} onChange={event => setSources(event.target.value)} className="field-input mt-2 min-h-24 resize-y" placeholder="One HTTPS URL per line (optional)." /><label className="field-label mt-4" htmlFor="visibility">Visibility</label><select id="visibility" value={visibility} onChange={event => setVisibility(event.target.value as typeof visibility)} className="field-input mt-2"><option value="public">Public in Truth Talk</option><option value="members">ROOT members</option><option value="private">Only me</option></select><Button disabled={publish.isPending} type="submit" className="mt-6 w-full rounded-xl bg-[#18211c] text-white hover:bg-[#25362a]"><Plus className="mr-2 h-4 w-4" />Publish with integrity receipt</Button></form>
      <section className="panel overflow-hidden"><div className="border-b border-[#dfe4dc] p-6"><h2 className="font-serif text-2xl">Your published claims</h2><p className="mt-2 text-sm text-[#647064]">A withdrawal preserves the fact that a version existed; it does not silently erase history.</p></div>{posts.isLoading ? <PanelLoading /> : posts.data?.length ? <div className="divide-y divide-[#dfe4dc]">{posts.data.map(post => <article key={post.id} className="p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-full bg-[#edf0ea] px-2.5 py-1 text-xs font-semibold text-[#51604f]">{prettyClaimType(post.claimType)}</span><span className="text-xs text-[#728071]">{formatDate(post.createdAt)}</span></div>{post.withdrawnAt ? <span className="text-xs font-semibold text-[#a0493e]">withdrawn</span> : <button onClick={() => withdraw.mutate({ postId: post.id })} className="text-xs font-semibold text-[#a0493e] hover:underline">Withdraw post</button>}</div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#28332a]">{post.body}</p><TruthSignals signals={post.signals} /><div className="mt-4 rounded-lg bg-[#f1f3ee] px-3 py-2 font-mono text-[10px] text-[#687468]">{post.integrityReceipt}</div>{post.evidenceDigest && <p className="mt-3 text-xs text-[#61715f]">File integrity digest declared: <span className="font-mono">{post.evidenceDigest}</span></p>}{post.sourceUrls.length > 0 && <p className="mt-3 text-xs text-[#61715f]">{post.sourceUrls.length} source {post.sourceUrls.length === 1 ? "URL" : "URLs"} declared</p>}</article>)}</div> : <EmptyState icon={<FileKey2 />} title="No published claims" body="A claim begins with a clear type, a statement, and optional source URLs. ROOT generates an integrity receipt when it is published." />}</section></div>
  </>;
}

function TruthSignals({ signals }: { signals: Array<{ key: keyof typeof TRUTH_OK_SIGNAL_LABELS; label: string; complete: boolean }> }) {
  return <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{signals.map(signal => <div key={signal.key} className={`rounded-lg border px-2.5 py-2 text-[10px] font-bold leading-4 ${signal.complete ? "border-[#c9de9f] bg-[#f1f9df] text-[#466026]" : "border-[#dfe3dc] bg-[#f8f9f7] text-[#7a8579]"}`}><span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${signal.complete ? "bg-[#78a53b]" : "bg-[#a8b1a6]"}`} />{signal.label}</div>)}</div>;
}

function VouchesPanel() {
  const utils = trpc.useUtils();
  const vouches = trpc.root.vouches.listMine.useQuery();
  const [memberCode, setMemberCode] = useState("");
  const [scope, setScope] = useState("");
  const [note, setNote] = useState("");
  const create = trpc.root.vouches.create.useMutation({ onSuccess: () => { utils.root.vouches.listMine.invalidate(); setMemberCode(""); setScope(""); setNote(""); toast.success("Scoped vouch sent for the recipient to accept."); } });
  const respond = trpc.root.vouches.respond.useMutation({ onSuccess: () => { utils.root.vouches.listMine.invalidate(); utils.root.memberRecord.mine.invalidate(); toast.success("Vouch response recorded."); } });
  const revoke = trpc.root.vouches.revoke.useMutation({ onSuccess: () => { utils.root.vouches.listMine.invalidate(); utils.root.memberRecord.mine.invalidate(); toast.success("Scoped vouch revoked."); } });
  const submit = (event: FormEvent) => { event.preventDefault(); create.mutate({ recipientMemberCode: memberCode, scope, note: note || undefined }); };

  return <>
    <SectionHeading eyebrow="SCOPED VOUCHES" title="A vouch is an invitation, not a score.">Each vouch names a limited scope, remains pending until accepted, and can be revoked by either participant. ROOT never turns it into universal reputation.</SectionHeading>
    <div className="grid gap-5 xl:grid-cols-[.86fr_1.14fr]"><form onSubmit={submit} className="panel p-6"><h2 className="font-serif text-2xl">Issue a scoped vouch</h2><label className="field-label mt-5" htmlFor="member-code">Recipient member code</label><input id="member-code" required value={memberCode} onChange={event => setMemberCode(event.target.value)} className="field-input mt-2 font-mono text-xs" placeholder="root-..." /><label className="field-label mt-4" htmlFor="vouch-scope">Scope</label><input id="vouch-scope" required value={scope} onChange={event => setScope(event.target.value)} className="field-input mt-2" placeholder="e.g. source review in a named domain" /><label className="field-label mt-4" htmlFor="vouch-note">Optional note</label><textarea id="vouch-note" value={note} onChange={event => setNote(event.target.value)} className="field-input mt-2 min-h-24 resize-y" placeholder="State the narrow context for this vouch." /><Button disabled={create.isPending} type="submit" className="mt-6 w-full rounded-xl bg-[#18211c] text-white hover:bg-[#25362a]">Send vouch for acceptance</Button></form>
      <section className="panel overflow-hidden"><div className="border-b border-[#dfe4dc] p-6"><h2 className="font-serif text-2xl">Your vouches</h2></div>{vouches.isLoading ? <PanelLoading /> : vouches.data?.vouches.length ? <div className="divide-y divide-[#dfe4dc]">{vouches.data.vouches.map(vouch => { const received = vouch.subjectUserId === vouches.data.currentUserId; return <div className="p-5" key={vouch.id}><div className="flex flex-wrap justify-between gap-3"><div><p className="font-medium">{vouch.scope}</p><p className="mt-1 text-[10px] font-bold tracking-[0.12em] text-[#718071]">{received ? "RECEIVED VOUCH" : "ISSUED VOUCH"}</p>{vouch.note && <p className="mt-2 text-xs leading-5 text-[#647064]">{vouch.note}</p>}</div><span className="rounded-full bg-[#edf0ea] px-2.5 py-1 text-xs font-semibold text-[#556254]">{vouch.status}</span></div><div className="mt-4 flex flex-wrap gap-4 text-xs">{received && vouch.status === "pending" && <><button onClick={() => respond.mutate({ vouchId: vouch.id, decision: "active" })} className="font-semibold text-[#4e7221] hover:underline">Accept</button><button onClick={() => respond.mutate({ vouchId: vouch.id, decision: "declined" })} className="font-semibold text-[#9b3d30] hover:underline">Decline</button></>} {(vouch.status === "pending" || vouch.status === "active") && <button onClick={() => revoke.mutate({ vouchId: vouch.id })} className="font-semibold text-[#9b3d30] hover:underline">Revoke</button>}</div></div>; })}</div> : <EmptyState icon={<HeartHandshake />} title="No scoped vouches yet" body="To create a vouch, ask the recipient for their private ROOT member code and specify the precise scope." />}</section></div>
  </>;
}

function ServicesPanel() {
  const services = trpc.root.services.list.useQuery();
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const proof = trpc.root.services.eligibility.useQuery({ serviceId: selectedService ?? 0 }, { enabled: selectedService !== null });
  return <>
    <SectionHeading eyebrow="SOVEREIGN SERVICES" title="Prove eligibility, not your private history.">Services can request a minimum eligibility presentation. ROOT returns only an appropriate proof outcome, never the underlying member record.</SectionHeading>
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{services.isLoading ? <PanelLoading /> : services.data?.length ? services.data.map(service => <article className="panel flex flex-col p-6" key={service.id}><p className="text-[10px] font-bold tracking-[0.14em] text-[#647964]">{service.serviceType}</p><h2 className="mt-3 font-serif text-2xl">{service.name}</h2><p className="mt-3 flex-1 text-sm leading-6 text-[#647064]">{service.description}</p><div className="mt-5 rounded-xl bg-[#f1f3ee] p-3"><p className="text-[10px] font-bold tracking-[0.12em] text-[#697668]">MINIMUM ELIGIBILITY</p><p className="mt-1 text-xs text-[#40503f]">{service.eligibilityRequirement}</p></div><Button variant="outline" onClick={() => setSelectedService(service.id)} className="mt-5 rounded-xl border-[#cbd3c9] bg-white">Present proof</Button></article>) : <div className="panel md:col-span-2 xl:col-span-3"><EmptyState icon={<ShieldCheck />} title="Service directory is not populated" body="ROOT will display sovereign services only after a provider publishes a clear eligibility policy and a public service record." /></div>}</section>
    {selectedService !== null && <section className="panel mt-5 p-6"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-[#5e755e]">ELIGIBILITY PRESENTATION</p><h2 className="mt-3 font-serif text-2xl">Minimum proof result</h2></div><button onClick={() => setSelectedService(null)} className="rounded-lg p-2 text-[#657064] hover:bg-[#eef1eb]"><X className="h-4 w-4" /></button></div>{proof.isLoading ? <div className="mt-5"><PanelLoading /></div> : proof.data ? <><p className="mt-4 text-sm leading-6 text-[#4b584b]">{proof.data.presentation}</p><p className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${proof.data.eligible ? "bg-[#e8f6c8] text-[#456028]" : "bg-[#f1f3ee] text-[#687468]"}`}>{proof.data.eligible ? "Minimum proof available" : "No proof presented"}</p></> : null}</section>}
  </>;
}

function EmergencyPanel() {
  const [emergencyType, setEmergencyType] = useState<"safety" | "shelter" | "food" | "health" | "legal" | "other">("safety");
  const lookup = trpc.root.emergency.lookup.useMutation();
  const request = () => {
    if (!window.confirm("Allow ROOT to use your location one time for this urgent resource lookup? ROOT will not store location history.")) return;
    if (!navigator.geolocation) { lookup.mutate({ emergencyType, oneTimeLocationConsent: true }); return; }
    navigator.geolocation.getCurrentPosition(
      position => lookup.mutate({ emergencyType, oneTimeLocationConsent: true, latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => lookup.mutate({ emergencyType, oneTimeLocationConsent: true }),
      { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 },
    );
  };
  return <>
    <SectionHeading eyebrow="EMERGENCY RESOURCES" title="Urgent help without a trust requirement.">This lookup is available to anyone. Location access is explicit and one-time; ROOT does not persist location history or require a member score.</SectionHeading>
    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><section className="rounded-[1.5rem] bg-[#18211c] p-7 text-[#e9f0e8]"><MapPinned className="h-7 w-7 text-[#b7ed55]" /><h2 className="mt-5 font-serif text-3xl">Find urgent help</h2><p className="mt-3 text-sm leading-6 text-[#b9c4ba]">Select the kind of resource you need. You will be asked before your device shares a one-time location with this lookup.</p><label className="field-label mt-6 !text-[#b7c6b8]" htmlFor="emergency-type">Resource type</label><select id="emergency-type" value={emergencyType} onChange={event => setEmergencyType(event.target.value as typeof emergencyType)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none"><option value="safety">Safety</option><option value="shelter">Shelter</option><option value="food">Food</option><option value="health">Health</option><option value="legal">Legal</option><option value="other">Other</option></select><Button disabled={lookup.isPending} onClick={request} className="mt-6 w-full rounded-xl bg-[#b7ed55] font-semibold text-[#18211c] hover:bg-[#c9fb71]"><MapPinned className="mr-2 h-4 w-4" />Use one-time location</Button><p className="mt-4 text-xs leading-5 text-[#aebcae]">{EMERGENCY_PRIVACY_NOTICE}</p></section>
      <section className="panel overflow-hidden"><div className="border-b border-[#dfe4dc] p-6"><h2 className="font-serif text-2xl">Resource results</h2><p className="mt-2 text-sm text-[#647064]">ROOT shows published, verified directory entries and does not create a persistent emergency or location record.</p></div>{lookup.isIdle ? <EmptyState icon={<CircleAlert />} title="Ready when you are" body="Choose a resource type and give one-time location consent to begin a lookup." /> : lookup.isPending ? <PanelLoading /> : <div className="p-6"><p className="rounded-xl bg-[#f1f3ee] p-4 text-sm leading-6 text-[#526052]">{lookup.data?.message}</p>{lookup.data?.resources.map(resource => <article className="mt-4 rounded-xl border border-[#dfe4dc] p-4" key={resource.id}><p className="font-medium">{resource.resourceName}</p><p className="mt-1 text-xs text-[#677367]">{resource.regionLabel}</p><p className="mt-3 text-sm">{resource.contactLabel}</p>{resource.contactUrl && <a href={resource.contactUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-[#547c24] hover:underline">Open verified contact</a>}</article>)}</div>}</section></div>
  </>;
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <div className="p-8 text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#eef1eb] text-[#61705f]">{icon}</div><h3 className="mt-4 font-serif text-xl">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#687468]">{body}</p></div>;
}

function PanelLoading() { return <div className="grid min-h-40 place-items-center p-8 text-[#667064]"><Loader2 className="h-5 w-5 animate-spin" /></div>; }
function PanelError() { return <div className="panel p-6 text-sm text-[#9b3d30]">This private record could not be loaded. Please refresh and try again.</div>; }

function LocalFileDigestControl({ digest, onDigest }: { digest: string; onDigest: (value: string) => void }) {
  const [hashing, setHashing] = useState(false);
  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setHashing(true);
    try {
      const bytes = await file.arrayBuffer();
      onDigest(await deriveFileIntegrityDigest(bytes));
      toast.success("Local file integrity digest ready.", { description: "The file itself was not uploaded or stored by ROOT." });
    } catch {
      toast.error("ROOT could not derive a file digest in this browser.");
    } finally {
      setHashing(false);
      event.target.value = "";
    }
  };

  return <div className="mb-5 rounded-[1.25rem] border border-[#d9ddd4] bg-[#f7f8f4] p-4 sm:flex sm:items-center sm:justify-between sm:gap-5"><div><p className="text-xs font-bold tracking-[0.12em] text-[#627661]">LOCAL FILE INTEGRITY</p><p className="mt-1 text-xs leading-5 text-[#687468]">Derive a SHA-256 receipt in your browser. ROOT stores only the declared digest with your claim, never the source file.</p>{digest && <p className="mt-2 break-all font-mono text-[10px] text-[#4d614c]">{digest}</p>}</div><label className="mt-3 inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#cbd4c7] bg-white px-4 py-2 text-xs font-semibold text-[#263429] transition hover:bg-[#eef4e7] sm:mt-0"><input type="file" onChange={handleFile} className="sr-only" />{hashing ? "Deriving digest…" : digest ? "Replace file hash" : "Choose file to hash"}</label></div>;
}
