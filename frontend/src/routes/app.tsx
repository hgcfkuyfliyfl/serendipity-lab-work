import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Bookmark,
  Compass,
  LogOut,
  FlaskConical,
  GitCompare,
  ListTree,
  Menu,
  Network,
  PanelLeftClose,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/lab";
import { Toaster } from "@/components/ui/sonner";
import { isApiConfigured } from "@/lib/api";
import { auth, useUser } from "@/lib/auth";
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
  const [menu, setMenu] = useState(false);
  const user = useUser();
  const navigate = useNavigate();
  useEffect(() => {
    if (user === null) navigate({ to: "/signin" });
  }, [user, navigate]);
  const savedCount = useStore((s) => s.saved.length);
  const reduce = useStore((s) => s.reduceMotion);
  const running = useStore((s) => s.run?.status === "running");
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduce);
  }, [reduce]);

  if (!user) return null;
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-full">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-ink text-ink-foreground transition-[width,transform] md:sticky md:top-0 md:h-screen md:translate-x-0",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/" className={cn(collapsed && "sr-only")}>
            <Logo inverted />
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-md p-1.5 text-ink-muted hover:bg-ink-line md:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeftClose className={cn("h-4 w-4", collapsed && "rotate-180")} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2" aria-label="Application">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className="group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-muted hover:bg-ink-line hover:text-ink-foreground data-[status=active]:bg-ink-line data-[status=active]:text-ink-foreground data-[status=active]:before:absolute data-[status=active]:before:left-0 data-[status=active]:before:h-5 data-[status=active]:before:w-0.5 data-[status=active]:before:bg-ochre"
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && label === "Saved Ideas" && savedCount > 0 && (
                <span className="font-mono text-[11px]">{savedCount}</span>
              )}
              {!collapsed && label === "Agent Trace" && running && (
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-ochre"
                  aria-label="running"
                />
              )}
            </Link>
          ))}
        </nav>
        {!collapsed && (
          <p className="m-4 rounded-md border border-ink-line p-3 font-mono text-[10px] leading-relaxed text-ink-muted">
            {isApiConfigured()
              ? "PROTOTYPE · Runs come from the team's backend. Scores are not validated against a baseline."
              : "PROTOTYPE · Runs are written live by Gemini and are not verified. No paper corpus is connected."}
          </p>
        )}
      </aside>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 md:px-8">
          <button
            className="rounded-md p-2 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="eyebrow">Workspace</span>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="mock-tag">Unverified</span>
            <div className="relative">
              <button
                onClick={() => setMenu((m) => !m)}
                aria-expanded={menu}
                aria-label="Account menu"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground"
              >
                {initials}
              </button>
              {menu && (
                <div className="absolute right-0 top-10 z-30 w-56 rounded-lg border border-border bg-card p-2 shadow-lg">
                  <p className="px-2 pt-1 text-sm font-medium">{user.name}</p>
                  <p className="truncate px-2 pb-2 text-xs text-muted-foreground">{user.email}</p>
                  <Link
                    to="/app/settings"
                    onClick={() => setMenu(false)}
                    className="block rounded px-2 py-1.5 text-sm hover:bg-secondary"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      auth.signOut();
                      navigate({ to: "/" });
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-secondary"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
          <Outlet />
        </main>
        <Toaster position="bottom-right" />
      </div>
    </div>
  );
}
