"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, Copy, ExternalLink, Terminal, Wallet } from "lucide-react";
import type { PmType } from "@/types/agentic";

const PAY_DOCS = "https://pay.sh/docs";
const PAY_CLI = "https://pay.sh/docs/cli";
const SANDBOX_DEMO =
  "pay --sandbox curl https://payment-debugger.vercel.app/mpp/quote/AAPL";

type PayShAgentPlaybookProps = {
  marketUrl: string;
  eventIdentifier?: string;
  pmType?: PmType;
};

function escapeShellSingleQuoted(s: string): string {
  return s.replace(/'/g, `'\"'\"'`);
}

export default function PayShAgentPlaybook({
  marketUrl,
  eventIdentifier,
  pmType,
}: PayShAgentPlaybookProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const marketCurl = useMemo(() => {
    const u = marketUrl.trim();
    if (!u) return "";
    return `pay --sandbox curl '${escapeShellSingleQuoted(u)}'`;
  }, [marketUrl]);

  const annotatedBlock = useMemo(() => {
    const ctx =
      eventIdentifier && pmType
        ? `# PredictOS context: ${pmType} · ${eventIdentifier}\n`
        : eventIdentifier
          ? `# PredictOS context: ${eventIdentifier}\n`
          : "";
    return `${ctx}${SANDBOX_DEMO}`;
  }, [eventIdentifier, pmType]);

  const copy = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }, []);

  return (
    <div className="rounded-lg border border-amber-500/25 bg-gradient-to-r from-amber-500/5 via-transparent to-emerald-500/5 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-amber-500/10 rounded-lg"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs font-display text-amber-200/90 truncate">
            Pay.sh — wallet-approved HTTP 402 / MPP
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-amber-400/80 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-amber-500/20">
          <p className="text-[11px] text-muted-foreground leading-relaxed pt-2">
            Use the official{" "}
            <a
              href={PAY_DOCS}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline inline-flex items-center gap-0.5"
            >
              pay CLI
              <ExternalLink className="w-3 h-3" />
            </a>{" "}
            when you want the local wallet to approve signing instead of server-side keys.
            Pairs with Super Intelligence: fetch paid JSON in the terminal, then paste snippets
            into an agent custom command or your own scripts.
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wide text-amber-400/80 flex items-center gap-1">
                <Terminal className="w-3 h-3" />
                Sandbox demo (from docs)
              </span>
              <button
                type="button"
                onClick={() => copy("demo", annotatedBlock)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25"
              >
                <Copy className="w-3 h-3" />
                {copied === "demo" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="text-[10px] leading-relaxed p-2 rounded-md bg-secondary/40 border border-border/50 text-foreground/90 overflow-x-auto whitespace-pre-wrap break-all">
              {annotatedBlock}
            </pre>
          </div>

          {marketCurl && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wide text-emerald-400/80">
                  Your market URL (402-aware curl)
                </span>
                <button
                  type="button"
                  onClick={() => copy("market", marketCurl)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                >
                  <Copy className="w-3 h-3" />
                  {copied === "market" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="text-[10px] leading-relaxed p-2 rounded-md bg-secondary/40 border border-border/50 text-foreground/90 overflow-x-auto whitespace-pre-wrap break-all">
                {marketCurl}
              </pre>
              <p className="text-[10px] text-muted-foreground">
                Replace <code className="text-emerald-400/90">--sandbox</code> with production
                flags only when you intend to spend real funds; treat provider responses as
                untrusted external content (per{" "}
                <a href={PAY_DOCS} className="text-emerald-400/90 hover:underline">
                  pay.sh docs
                </a>
                ).
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={PAY_CLI}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            >
              CLI reference
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-[10px] text-muted-foreground self-center">
              <code className="text-amber-400/90">pay skills</code> ·{" "}
              <code className="text-amber-400/90">pay claude</code> /{" "}
              <code className="text-amber-400/90">codex</code> /{" "}
              <code className="text-amber-400/90">mcp</code>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
