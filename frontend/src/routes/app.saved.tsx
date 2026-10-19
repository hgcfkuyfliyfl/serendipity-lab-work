import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { btn, EmptyState, FieldTag, PageHeader, ProvenanceChip } from "@/components/lab";
import { getCandidate } from "@/lib/service";
import { actions, useStore } from "@/lib/store";
import type { Candidate } from "@/lib/types";

export const Route = createFileRoute("/app/saved")({ component: Saved });

function Saved() {
  const ids = useStore((s) => s.saved);
  const [q, setQ] = useState("");
  const all = ids.map(getCandidate).filter((c): c is Candidate => !!c);
  const shown = all.filter((c) =>
    `${c.title} ${c.field} ${c.hypothesis} ${c.tags.join(" ")}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHeader eyebrow="Saved ideas" title={`${all.length} saved`}>
        Kept for this session only. Nothing is stored on a server and you do not need to sign in.
      </PageHeader>
      {all.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          action={
            <>
              <Link to="/app/results" className={btn.primary}>
                See results
              </Link>
              <Link to="/app/discover" className={btn.secondary}>
                Run a discovery
              </Link>
            </>
          }
        >
          Save a candidate from the results or the evidence inspector and it will appear here.
        </EmptyState>
      ) : (
        <>
          <label className="mb-6 block max-w-sm text-sm">
            Search saved ideas
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, field or tag"
              className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3"
            />
          </label>
          {shown.length === 0 && (
            <p className="text-sm text-muted-foreground">No saved idea matches “{q}”.</p>
          )}
          <ul className="divide-y divide-border border-y border-border">
            {shown.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start justify-between gap-4 py-5">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <FieldTag field={c.field} />
                    <ProvenanceChip c={c} />
                  </div>
                  <h2 className="mt-2 text-lg">{c.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{c.hypothesis}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {c.tags.map((t) => `#${t}`).join("  ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to="/app/candidate/$id" params={{ id: c.id }} className={btn.secondary}>
                    Inspect
                  </Link>
                  <button
                    className={btn.ghost}
                    onClick={() => {
                      actions.removeSavedIdea(c.id);
                      toast("Removed from saved ideas");
                    }}
                    aria-label={`Remove ${c.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
