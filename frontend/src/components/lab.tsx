import { Bookmark, BookmarkCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { actions, useStore } from "@/lib/store";
import type { Candidate, Heresy, MatchedOn, ReviewStatus } from "@/lib/types";

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-serif text-lg", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <g
          stroke="currentColor"
          strokeWidth="1.6"
          fill="none"
          className={inverted ? "text-ink-foreground" : "text-primary"}
        >
          <line x1="16" y1="7" x2="8" y2="23" />
          <line x1="16" y1="7" x2="24" y2="23" />
          <line x1="8" y1="23" x2="24" y2="23" />
        </g>
        <circle cx="16" cy="7" r="3.2" className="fill-terracotta" />
        <circle
          cx="8"
          cy="23"
          r="3.2"
          className={inverted ? "fill-ink-foreground" : "fill-primary"}
        />
        <circle cx="24" cy="23" r="3.2" className="fill-forest" />
      </svg>
      Serendipity Lab
    </span>
  );
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none h-9 px-4";
export const btn = {
  primary: cn(
    btnBase,
    "bg-primary text-primary-foreground shadow-[inset_0_-1px_0_rgb(0_0_0/0.25)] hover:bg-primary/90",
  ),
  secondary: cn(btnBase, "border border-border bg-card text-foreground hover:bg-secondary"),
  ghost: cn(btnBase, "text-muted-foreground hover:bg-secondary hover:text-foreground"),
};

export function MockTag({ children = "Mock data" }: { children?: ReactNode }) {
  return <span className="mock-tag">{children}</span>;
}

export function Chip({
  active,
  children,
  onClick,
  ...rest
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  "aria-pressed"?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      {...rest}
      className={cn(
        "rounded-md border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}

export function FieldTag({ field }: { field: string }) {
  return (
    <span className="rounded-sm bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
      {field}
    </span>
  );
}

const reviewMap: Record<ReviewStatus, { label: string; cls: string }> = {
  supported: { label: "Model reviewer: supported", cls: "text-forest border-forest/40" },
  plausible: { label: "Model reviewer: plausible", cls: "text-ochre border-ochre/50" },
  contested: { label: "Model reviewer: contested", cls: "text-terracotta border-terracotta/50" },
};
export function ReviewBadge({ status }: { status: ReviewStatus }) {
  const r = reviewMap[status];
  return (
    <span className={cn("rounded-sm border px-1.5 py-0.5 text-[11px]", r.cls)}>{r.label}</span>
  );
}

const heresyMap: Record<Heresy, { label: string; cls: string }> = {
  high: { label: "Heresy: high", cls: "text-terracotta border-terracotta/50" },
  medium: { label: "Heresy: medium", cls: "text-ochre border-ochre/50" },
  low: { label: "Heresy: low", cls: "text-muted-foreground border-border" },
};
/** Topical distance from the home field. Derived on the server, never computed here. */
export function HeresyBadge({ level }: { level: Heresy }) {
  const h = heresyMap[level];
  return (
    <span
      className={cn("rounded-sm border px-1.5 py-0.5 text-[11px]", h.cls)}
      title="Topical distance from your home field"
    >
      {h.label}
    </span>
  );
}

/** Where a result really comes from. Replaces vague words like "verified" or "high confidence". */
export function ProvenanceChip({ c }: { c: Candidate }) {
  const grounded = !!c.source.passage && c.mapping.length > 0;
  const label = c.fixture
    ? "Cached fixture · real passage and DOI · placeholder scores"
    : c.corpus
      ? !grounded
        ? "Corpus retrieval · no passage returned · not grounded"
        : c.corpusStub
          ? "Backend run · placeholder corpus · passage is not a verbatim quote"
          : "Corpus retrieval · passage quoted from the retrieved paper"
      : c.live
        ? grounded
          ? "Live model output"
          : "Live model output · no source retrieved · not grounded"
        : "Source not retrieved";
  return (
    <span
      className={cn(
        "rounded-sm border px-1.5 py-0.5 text-[11px]",
        grounded ? "border-forest/40 text-forest" : "border-terracotta/50 text-terracotta",
      )}
    >
      {label}
    </span>
  );
}

export function MatchedChip({ on }: { on: MatchedOn }) {
  return <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[11px]">Matched on {on}</span>;
}

export function SaveButton({ id, compact }: { id: string; compact?: boolean }) {
  const saved = useStore((s) => s.saved.includes(id));
  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <button
      type="button"
      onClick={() => actions.toggleSaved(id)}
      aria-pressed={saved}
      aria-label={saved ? "Remove saved idea" : "Save idea"}
      className={cn(
        compact ? "rounded-md p-2 hover:bg-secondary" : btn.secondary,
        saved && "text-primary",
      )}
    >
      <Icon className="h-4 w-4" />
      {!compact && (saved ? "Saved" : "Save idea")}
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div className="max-w-2xl">
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        {children && <p className="mt-2 text-sm text-muted-foreground">{children}</p>}
      </div>
      {aside}
    </header>
  );
}

export function ScoreBar({ value, label = "Demo score" }: { value: number; label?: string }) {
  return (
    <div className="min-w-24">
      <div className="flex items-baseline justify-between gap-2 font-mono text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground">{value}</span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-secondary">
        <div className="h-1 rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export const FIELD_FILL: Record<string, string> = {
  Robotics: "fill-primary",
  "Soft Matter Physics": "fill-ochre",
  "Civil Engineering": "fill-ochre",
  Biology: "fill-forest",
  "Materials Science": "fill-ochre",
  Physics: "fill-ochre",
  "Computer Science": "fill-primary",
  Ecology: "fill-forest",
  Medicine: "fill-terracotta",
  Economics: "fill-primary",
};

/** Plain inline copy of text with a toast. Falls back when the Clipboard API is blocked. */
export async function copyText(text: string, toast: (m: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Hypothesis copied");
  } catch {
    toast("Copy is blocked in this browser. Select the text and copy it manually.");
  }
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      <h2 className="text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{children}</p>
      {action && <div className="mt-5 flex justify-center gap-3">{action}</div>}
    </div>
  );
}
