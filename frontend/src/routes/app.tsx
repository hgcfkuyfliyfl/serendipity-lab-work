import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Bookmark, Compass, FlaskConical, GitCompare, ListTree, Menu, Network, PanelLeftClose, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/lab";
import { Toaster } from "@/components/ui/sonner";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({ component: AppLayout });

const NAV = [
  { to: "/app/discover", label: "Discover", icon: Compass },
  { to: "/app/saved", label: "Saved Ideas", icon: Bookmark },
  { to: "/app/trace", label: "Agent Trace", icon: ListTree },
  { to: "/app/pulse", label: "Pulse Map", icon: Network },
  { to: "/app/compare", label: "Compare", icon: GitCompare },
  { to: "/app/validation", label: "Validation", icon: FlaskConical },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const savedCount = useStore((s) => s.saved.length);
  const reduce = useStore((s) => s.reduceMotion);
  const running = useStore((s) => s.run?.status === "running");
  useEffect(() => { document.documentElement.classList.toggle("reduce-motion", reduce); }, [reduce]);

  return (
    <div className="flex min-h-screen w-full">
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex flex-col bg-ink text-ink-foreground transition-[width,transform] md:sticky md:top-0 md:h-screen md:translate-x-0",
        collapsed ? "w-16" : "w-60", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/" className={cn(collapsed && "sr-only")}><Logo inverted /></Link>
          <button onClick={() => setCollapsed((c) => !c)} className="hidden rounded-md p-1.5 text-ink-muted hover:bg-ink-line md:block" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <PanelLeftClose className={cn("h-4 w-4", collapsed && "rotate-180")} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2" aria-label="Application">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setMobileOpen(false)}
              className="group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-muted hover:bg-ink-line hover:text-ink-foreground data-[status=active]:bg-ink-line data-[status=active]:text-ink-foreground data-[status=active]:before:absolute data-[status=active]:before:left-0 data-[status=active]:before:h-5 data-[status=active]:before:w-0.5 data-[status=active]:before:bg-ochre"
              title={collapsed ? label : undefined}>
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && label === "Saved Ideas" && savedCount > 0 && <span className="font-mono text-[11px]">{savedCount}</span>}
              {!collapsed && label === "Agent Trace" && running && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ochre" aria-label="running" />}
            </Link>
          ))}
        </nav>
        {!collapsed && <p className="m-4 rounded-md border border-ink-line p-3 font-mono text-[10px] leading-relaxed text-ink-muted">DEMO MODE · All results are local mock data. No backend connected.</p>}
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-foreground/30 md:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 md:px-8">
          <button className="rounded-md p-2 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
          <span className="eyebrow">Workspace</span>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="mock-tag">Demo data</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground" aria-label="Guest researcher">GR</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8"><Outlet /></main>
        <Toaster position="bottom-right" />
      </div>
    </div>
  );
}
