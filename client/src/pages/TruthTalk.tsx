import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, CircleCheck, ExternalLink, FileKey2, Link2, Radio, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

type Filter = "all" | "report" | "firsthand_account" | "analysis" | "correction" | "opinion" | "question";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All declarations" },
  { value: "report", label: "Reports" },
  { value: "firsthand_account", label: "Firsthand" },
  { value: "analysis", label: "Analysis" },
  { value: "correction", label: "Corrections" },
];

function claimLabel(value: string) {
  return value === "firsthand_account" ? "Firsthand account" : value.replaceAll("_", " ");
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function RootGlyph() {
  return <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#c7ff61] font-serif text-xl font-bold text-[#111713]">T</span>;
}

export default function TruthTalk() {
  const { isAuthenticated } = useAuth();
  const feed = trpc.root.truthTalk.feed.useQuery();
  const [filter, setFilter] = useState<Filter>("all");
  const [activeIndex, setActiveIndex] = useState(0);

  const posts = useMemo(() => {
    const all = feed.data ?? [];
    return filter === "all" ? all : all.filter(post => post.claimType === filter);
  }, [feed.data, filter]);
  const activePost = posts[Math.min(activeIndex, Math.max(posts.length - 1, 0))];

  const selectFilter = (value: Filter) => {
    setFilter(value);
    setActiveIndex(0);
  };
  const move = (direction: -1 | 1) => setActiveIndex(index => Math.max(0, Math.min(posts.length - 1, index + direction)));

  return (
    <div className="min-h-screen bg-[#0b0f0d] text-[#f4f8ef]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0f0d]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1520px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3"><RootGlyph /><div><p className="font-serif text-lg leading-none">Truth Talk</p><p className="mt-1 text-[9px] font-bold tracking-[.18em] text-[#9bab97]">ROOT MEDIA LEDGER</p></div></Link>
          <div className="hidden items-center gap-2 text-xs text-[#a8b6a6] md:flex"><Radio className="h-3.5 w-3.5 text-[#c7ff61]" />Public declarations, provenance visible, no binary verdicts.</div>
          {isAuthenticated ? <Link href="/app"><Button variant="outline" className="h-9 rounded-full border-white/15 bg-white/[.04] px-4 text-xs text-white hover:bg-white/[.1] hover:text-white">Open ROOT</Button></Link> : <Button onClick={startLogin} className="h-9 rounded-full bg-[#c7ff61] px-4 text-xs font-bold text-[#111713] hover:bg-[#d6ff89]">Sign in to publish</Button>}
        </div>
      </header>

      <main className="mx-auto max-w-[1520px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <section className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl"><p className="text-[10px] font-bold tracking-[.2em] text-[#c7ff61]">SWIPE-FIRST PUBLIC RECORD</p><h1 className="mt-3 font-serif text-4xl leading-[.96] tracking-[-.035em] sm:text-6xl">Evidence should travel with the claim.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-[#aeb9ac]">Truth Talk is a separate viewing space for reports, accounts, analysis, corrections, and questions. It takes the ease of a modern media feed while keeping sources, integrity receipts, and limits in view.</p></div>
          <div className="rounded-2xl border border-[#c7ff61]/20 bg-[#c7ff61]/[.07] px-4 py-3 text-xs leading-5 text-[#d9ebc4]">No engagement score. No hidden ranking claim. Browse by declared format and inspect the record.</div>
        </section>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Filter public declarations">
          {FILTERS.map(item => <button key={item.value} type="button" onClick={() => selectFilter(item.value)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${filter === item.value ? "border-[#c7ff61] bg-[#c7ff61] text-[#111713]" : "border-white/12 bg-white/[.035] text-[#b7c2b4] hover:border-white/25 hover:bg-white/[.08]"}`}>{item.label}</button>)}
        </div>

        {feed.isLoading ? <LoadingLedger /> : posts.length === 0 ? <EmptyLedger isFiltered={filter !== "all"} /> : <>
          <section className="md:hidden">
            <div className="flex snap-y snap-mandatory flex-col gap-4 overflow-y-auto pb-4" aria-label="Swipe through public Truth Talk declarations">
              {posts.map((post, index) => <article key={post.id} className="relative flex min-h-[72svh] snap-start flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#121914] p-6 shadow-2xl shadow-black/30"><div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_85%_5%,rgba(199,255,97,.23),transparent_60%)]" /><DeclarationMeta post={post} /><p className="relative mt-auto whitespace-pre-wrap font-serif text-3xl leading-[1.03] tracking-[-.025em]">{post.body}</p><p className="relative mt-5 text-xs text-[#95a394]">Swipe for the next declared record · {index + 1} / {posts.length}</p><SignalRail post={post} /><LedgerFooter post={post} /></article>)}
            </div>
          </section>

          <section className="hidden grid-cols-[210px_minmax(0,1fr)_320px] gap-5 md:grid">
            <aside className="sticky top-24 h-fit rounded-[1.5rem] border border-white/10 bg-white/[.035] p-4"><p className="text-[10px] font-bold tracking-[.16em] text-[#93a691]">VIEWING MODE</p><h2 className="mt-3 font-serif text-2xl">Story deck</h2><p className="mt-3 text-xs leading-5 text-[#9eaa9b]">Use the arrows to step through declared records. Each declaration carries its own route to provenance.</p><div className="mt-6 rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-[10px] font-bold text-[#c7ff61]">{activeIndex + 1} OF {posts.length}</p><p className="mt-1 text-xs text-[#b5c0b3]">{claimLabel(activePost.claimType)}</p></div></aside>
            <article className="relative min-h-[650px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#121914] p-8 shadow-2xl shadow-black/30 xl:p-10"><div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_82%_0%,rgba(199,255,97,.27),transparent_56%)]" /><DeclarationMeta post={activePost} /><p className="relative mt-16 max-w-3xl whitespace-pre-wrap font-serif text-4xl leading-[1.04] tracking-[-.03em] xl:text-5xl">{activePost.body}</p><div className="absolute inset-x-8 bottom-8 flex items-center justify-between gap-4 xl:inset-x-10"><Button type="button" variant="outline" disabled={activeIndex === 0} onClick={() => move(-1)} className="h-11 rounded-full border-white/15 bg-white/[.04] px-4 text-white hover:bg-white/[.1] hover:text-white disabled:opacity-30"><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#c7ff61] transition-[width] duration-300" style={{ width: `${((activeIndex + 1) / posts.length) * 100}%` }} /></div><Button type="button" variant="outline" disabled={activeIndex >= posts.length - 1} onClick={() => move(1)} className="h-11 rounded-full border-white/15 bg-white/[.04] px-4 text-white hover:bg-white/[.1] hover:text-white disabled:opacity-30">Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div></article>
            <aside className="sticky top-24 h-fit space-y-4"><div className="rounded-[1.5rem] border border-white/10 bg-white/[.035] p-5"><p className="text-[10px] font-bold tracking-[.16em] text-[#c7ff61]">TRUTHOK SIGNALS</p><SignalRail post={activePost} /></div><div className="rounded-[1.5rem] border border-white/10 bg-white/[.035] p-5"><p className="text-[10px] font-bold tracking-[.16em] text-[#c7ff61]">PROVENANCE ROUTE</p><LedgerFooter post={activePost} /></div></aside>
          </section>
        </>}

        <section className="mt-8 flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/[.035] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#c7ff61]" /><p className="max-w-2xl text-xs leading-5 text-[#aeb8ac]">Truth Talk does not claim to determine universal truth. It displays the author’s declared claim type, the evidence path they supplied, and each distinct TruthOK signal.</p></div>{isAuthenticated ? <Link href="/app"><Button className="rounded-full bg-[#c7ff61] px-4 text-xs font-bold text-[#111713] hover:bg-[#d6ff89]">Publish a declared claim <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Button></Link> : <Button onClick={startLogin} className="rounded-full bg-[#c7ff61] px-4 text-xs font-bold text-[#111713] hover:bg-[#d6ff89]">Join ROOT to publish</Button>}</section>
      </main>
    </div>
  );
}

function DeclarationMeta({ post }: { post: { authorLabel: string; claimType: string; createdAt: Date | string } }) {
  return <div className="relative flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[#e3eadf]">{post.authorLabel}</p><p className="mt-1 text-xs text-[#91a18f]">{formatDate(post.createdAt)}</p></div><span className="rounded-full border border-[#c7ff61]/30 bg-[#c7ff61]/10 px-3 py-1 text-[10px] font-bold tracking-[.12em] text-[#d9f7ae]">{claimLabel(post.claimType)}</span></div>;
}

function SignalRail({ post }: { post: { signals: Array<{ key: string; label: string; complete: boolean }> } }) {
  return <div className="mt-5 grid gap-2">{post.signals.map(signal => <div key={signal.key} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${signal.complete ? "border-[#c7ff61]/25 bg-[#c7ff61]/[.08] text-[#d8efb1]" : "border-white/10 bg-black/10 text-[#a7b1a4]"}`}><CircleCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{signal.label}</div>)}</div>;
}

function LedgerFooter({ post }: { post: { integrityReceipt: string; sourceUrls: string[]; evidenceDigest?: string | null } }) {
  return <div className="mt-4 space-y-3"><div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] font-bold tracking-[.14em] text-[#9caf96]">INTEGRITY RECEIPT</p><p className="mt-1 break-all font-mono text-[10px] leading-4 text-[#d2ddd0]">{post.integrityReceipt}</p></div>{post.evidenceDigest && <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] font-bold tracking-[.14em] text-[#9caf96]">DECLARED FILE DIGEST</p><p className="mt-1 break-all font-mono text-[10px] leading-4 text-[#d2ddd0]">{post.evidenceDigest}</p></div>}<div><p className="flex items-center gap-2 text-[10px] font-bold tracking-[.14em] text-[#9caf96]"><Link2 className="h-3.5 w-3.5" />DECLARED SOURCES</p>{post.sourceUrls.length ? <div className="mt-2 space-y-2">{post.sourceUrls.map(url => <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-[11px] text-[#d7e2d4] hover:border-[#c7ff61]/35"><span className="truncate">{new URL(url).hostname}</span><ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#c7ff61]" /></a>)}</div> : <p className="mt-2 text-xs leading-5 text-[#95a294]">No source URLs were declared for this record.</p>}</div></div>;
}

function LoadingLedger() {
  return <div className="grid min-h-[420px] place-items-center rounded-[2rem] border border-white/10 bg-white/[.035] text-sm text-[#aeb8ac]"><div className="text-center"><Radio className="mx-auto h-6 w-6 animate-pulse text-[#c7ff61]" /><p className="mt-3">Loading the public ledger…</p></div></div>;
}

function EmptyLedger({ isFiltered }: { isFiltered: boolean }) {
  return <div className="grid min-h-[420px] place-items-center rounded-[2rem] border border-white/10 bg-white/[.035] p-8 text-center"><div className="max-w-md"><FileKey2 className="mx-auto h-7 w-7 text-[#c7ff61]" /><h2 className="mt-4 font-serif text-3xl">{isFiltered ? "No declarations in this format" : "The public ledger is quiet."}</h2><p className="mt-3 text-sm leading-6 text-[#aab5a8]">Truth Talk will show a public declaration only after its author selects visibility and ROOT creates an integrity receipt. Nothing is fabricated for the feed.</p><Link href="/"><Button variant="outline" className="mt-6 rounded-full border-white/15 bg-white/[.04] text-white hover:bg-white/[.1] hover:text-white"><ArrowLeft className="mr-1 h-4 w-4" />Return to ROOT</Button></Link></div></div>;
}
