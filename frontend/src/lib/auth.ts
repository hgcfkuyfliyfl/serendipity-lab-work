/** Demo-only auth. Stores a display name and email in localStorage. No password is stored or checked. */
import { useSyncExternalStore } from "react";

export interface User {
  name: string;
  email: string;
}

const KEY = "sl_user";
let user: User | null = null;
let loaded = false;
const subs = new Set<() => void>();

function read() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    user = raw ? (JSON.parse(raw) as User) : null;
  } catch {
    user = null;
  }
}
function set(next: User | null) {
  user = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: session-only */
  }
  subs.forEach((f) => f());
}

export const auth = { signIn: (u: User) => set(u), signOut: () => set(null) };

/** undefined = not known yet (server render / first paint), null = signed out. */
export function useUser(): User | null | undefined {
  return useSyncExternalStore<User | null | undefined>(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => (read(), user),
    () => undefined,
  );
}
