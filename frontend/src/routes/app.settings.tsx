import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { btn, MockTag, PageHeader } from "@/components/lab";
import { Switch } from "@/components/ui/switch";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/app/settings")({ component: Settings });

function Row({ id, title, desc, children }: { id: string; title: string; desc: string; children: ReactNode }) {
  return <div className="flex items-start justify-between gap-6 border-b border-border py-5"><div><label htmlFor={id} className="font-medium">{title}</label><p className="mt-1 max-w-md text-sm text-muted-foreground">{desc}</p></div>{children}</div>;
}

function Settings() {
  const reduce = useStore((s) => s.reduceMotion);
  const fail = useStore((s) => s.simulateFailure);
  return (
    <>
      <PageHeader eyebrow="Settings" title="Preferences">Local to this browser session.</PageHeader>
      <div className="max-w-2xl">
        <h2 className="text-xl">Appearance</h2>
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Theme">
          <button role="radio" aria-checked className={btn.primary}>Light (warm ivory)</button>
          <button role="radio" aria-checked={false} disabled className={btn.secondary}>Dark (not available yet)</button>
        </div>
        <h2 className="mt-8 text-xl">Motion</h2>
        <Row id="rm" title="Reduce motion" desc="Turns off transitions and the map animation."><Switch id="rm" checked={reduce} onCheckedChange={actions.setReduceMotion} /></Row>
        <h2 className="mt-8 text-xl">Demo mode <MockTag>Always on</MockTag></h2>
        <p className="mt-2 text-sm text-muted-foreground">Every result, score, passage and reviewer note comes from local fixtures. No backend, model or API key is used.</p>
        <Row id="sf" title="Simulate a retrieval failure" desc="The next run fails at retrieval so you can show the retry and cached-demo options. It fails once."><Switch id="sf" checked={fail} onCheckedChange={actions.setSimulateFailure} /></Row>
        <div className="py-5"><button className={btn.secondary} onClick={() => { actions.resetDemo(); toast("Demo reset"); }}>Reset demo</button></div>
        <h2 className="mt-4 text-xl">Account</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign-in and synced profiles are not part of this prototype.</p>
        <button className={`${btn.secondary} mt-3`} disabled>Sign in (coming later)</button>
      </div>
    </>
  );
}
