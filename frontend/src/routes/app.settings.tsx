import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { btn, MockTag, PageHeader } from "@/components/lab";
import { Switch } from "@/components/ui/switch";
import { isApiConfigured } from "@/lib/api";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/app/settings")({ component: Settings });

function Row({
  id,
  title,
  desc,
  children,
}: {
  id: string;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border py-5">
      <div>
        <label htmlFor={id} className="font-medium">
          {title}
        </label>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Settings() {
  const reduce = useStore((s) => s.reduceMotion);
  const fail = useStore((s) => s.simulateFailure);
  return (
    <>
      <PageHeader eyebrow="Settings" title="Preferences">
        Local to this browser session.
      </PageHeader>
      <div className="max-w-2xl">
        <h2 className="text-xl">Appearance</h2>
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Theme">
          <button role="radio" aria-checked className={btn.primary}>
            Light (warm ivory)
          </button>
          <button role="radio" aria-checked={false} disabled className={btn.secondary}>
            Dark (not available yet)
          </button>
        </div>
        <h2 className="mt-8 text-xl">Motion</h2>
        <Row id="rm" title="Reduce motion" desc="Turns off transitions and the map animation.">
          <Switch id="rm" checked={reduce} onCheckedChange={actions.setReduceMotion} />
        </Row>
        <h2 className="mt-8 text-xl">
          Data sources <MockTag>Prototype</MockTag>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The hero text replays a frozen fixture from src/mock: real passages and DOIs, placeholder
          scores and reviewer notes.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {isApiConfigured()
            ? "Any other text goes to the team's backend, which runs the agent loop and quotes a passage from each retrieved paper."
            : "No backend is connected in this build, so any other text goes to Gemini through the server, from its general knowledge, with no paper corpus and no source passages."}
        </p>
        <Row
          id="sf"
          title="Simulate a retrieval failure"
          desc="The next run fails at retrieval so you can show the retry and cached-demo options. It fails once."
        >
          <Switch id="sf" checked={fail} onCheckedChange={actions.setSimulateFailure} />
        </Row>
        <div className="py-5">
          <button
            className={btn.secondary}
            onClick={() => {
              actions.resetDemo();
              toast("Demo reset");
            }}
          >
            Reset demo
          </button>
        </div>
        <h2 className="mt-4 text-xl">Privacy</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          What happens to the text you type, and what is stored in this browser.
        </p>
        <Link
          to="/privacy"
          className="mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Read the privacy page
        </Link>
        <h2 className="mt-8 text-xl">Account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign-in and synced profiles are not part of this prototype.
        </p>
        <button className={`${btn.secondary} mt-3`} disabled>
          Sign in (coming later)
        </button>
      </div>
    </>
  );
}
