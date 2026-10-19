import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/lab";
import { isApiConfigured } from "@/lib/api";

export const Route = createFileRoute("/privacy")({ component: Privacy });

/** Each section describes what the prototype does today. Nothing here is a legal promise. */
const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "What this is",
    body: (
      <>
        <p>
          Serendipity Lab is a student prototype built for a hackathon. It is not a finished
          product, and this page is a plain description of how it handles your text. It is not legal
          advice.
        </p>
      </>
    ),
  },
  {
    heading: "What you send us",
    body: (
      <>
        <p>
          The only thing you give the app is the problem text you type, and the home field you pick.
          There is no file upload, no tracking of what you click, and no advertising.
        </p>
      </>
    ),
  },
  {
    heading: "Where your text goes",
    body: (
      <>
        <p>
          When you press Run on your own text, that text is sent to Google&rsquo;s Gemini API to
          produce the abstraction and the candidate list. Google processes it under its own terms.
          We do not control how long Google keeps it.
        </p>
        <p>
          When you play the cached hero demo, nothing leaves your browser. The demo replays a file
          that ships with the app.
        </p>
      </>
    ),
  },
  {
    heading: "What is stored, and where",
    body: (
      <>
        <p>
          Your demo sign-in and the last results you looked at are kept in your own browser&rsquo;s
          local storage, on your device. Saved ideas are weaker still: they live only in the open
          tab and disappear when you reload. None of it is sent to us, and we have no account
          database.
        </p>
        <p>
          The sign-in screen is a demo. The password you type is never sent anywhere and is never
          stored.
        </p>
      </>
    ),
  },
  {
    heading: "What the team can see",
    body: (
      <>
        <p>
          The backend keeps each run in memory while the server is running, so the results page can
          read it. Restarting the server erases it. There is no analytics service and no error
          tracker collecting your text.
        </p>
      </>
    ),
  },
  {
    heading: "Deleting your data",
    body: (
      <>
        <p>
          Clear your browser&rsquo;s site data for this app, or use Reset demo in Settings. That
          removes everything the app holds about you. Text already sent to Google is subject to
          Google&rsquo;s own retention.
        </p>
      </>
    ),
  },
  {
    heading: "Contact",
    body: (
      <p>
        Ask the Serendipity Lab team through the hackathon organisers. A contact address will be
        added here before any public release.
      </p>
    ),
  },
];

function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5">
          <Link to="/" aria-label="Serendipity Lab home">
            <Logo />
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to the home page
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="eyebrow">Prototype · not legal advice</p>
        <h1 className="mt-2 font-serif text-4xl">Privacy</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Short version: your problem text goes to Google Gemini when you run it, saved items stay
          in your browser, and nothing is sold or shared with anyone else.
        </p>

        <dl className="mt-10 space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.heading} className="border-t border-border pt-6">
              <dt className="font-serif text-xl">{section.heading}</dt>
              <dd className="mt-2 max-w-prose space-y-3 text-sm leading-relaxed text-muted-foreground">
                {section.body}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 font-mono text-[11px] text-muted-foreground">
          Model provider: Google Gemini. Backend:{" "}
          {isApiConfigured() ? "the team's API server" : "not connected in this build"}. Last
          reviewed when this page was written.
        </p>
      </main>
    </div>
  );
}
