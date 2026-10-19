import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { btn, Logo } from "@/components/lab";
import { auth, useUser } from "@/lib/auth";

export const Route = createFileRoute("/signin")({ component: SignIn });

function SignIn() {
  const navigate = useNavigate();
  const user = useUser();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate({ to: "/app/discover" });
  }, [user, navigate]);

  const enter = (n: string, e: string) => {
    auth.signIn({ name: n, email: e });
    navigate({ to: "/app/discover" });
  };
  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email address.");
    if (pw.length < 6) return setErr("Use a password of at least 6 characters.");
    if (mode === "up" && name.trim().length < 2) return setErr("Enter your name.");
    enter(mode === "up" ? name.trim() : (email.split("@")[0] ?? "Researcher"), email);
  };
  const field = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="hidden flex-col justify-between bg-ink p-10 text-ink-foreground lg:flex">
        <Link to="/">
          <Logo inverted />
        </Link>
        <div>
          <p className="font-serif text-4xl leading-tight">Different fields. Same problems.</p>
          <p className="mt-4 max-w-md text-sm text-ink-muted">
            Serendipity Lab strips a problem down to its structure, then searches other fields for
            the same shape.
          </p>
        </div>
        <p className="font-mono text-[11px] text-ink-muted">
          PROTOTYPE · demo sign-in only ·{" "}
          <Link to="/privacy" className="underline underline-offset-4 hover:text-ink-foreground">
            Privacy
          </Link>
        </p>
      </div>
      <main className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm" noValidate>
          <h1 className="font-serif text-3xl">
            {mode === "in" ? "Sign in to your lab" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Demo only. No account is created on a server and your password is never stored.
          </p>
          {mode === "up" && (
            <label className="mt-6 block text-sm font-medium">
              Name
              <input
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
          )}
          <label className="mt-4 block text-sm font-medium">
            Email
            <input
              className={field}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Password
            <input
              className={field}
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
            />
          </label>
          {err && (
            <p role="alert" className="mt-3 text-sm text-terracotta">
              {err}
            </p>
          )}
          <button type="submit" className={`${btn.primary} mt-6 w-full justify-center`}>
            {mode === "in" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            className={`${btn.secondary} mt-3 w-full justify-center`}
            onClick={() => enter("Demo Researcher", "demo@serendipity-lab.test")}
          >
            Continue as demo researcher
          </button>
          <p className="mt-6 text-sm text-muted-foreground">
            {mode === "in" ? "New here? " : "Already have an account? "}
            <button
              type="button"
              className="text-primary underline"
              onClick={() => {
                setMode(mode === "in" ? "up" : "in");
                setErr(null);
              }}
            >
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}
