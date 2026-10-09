import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ClipboardList, HeartPulse, Scale, Baby } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flockbook — Sheep Farm Records" },
      {
        name: "description",
        content:
          "Record and track your sheep: flock register, weights, health treatments and lambing, all in one place.",
      },
      { property: "og:title", content: "Flockbook — Sheep Farm Records" },
      {
        property: "og:description",
        content: "Flock register, weights, health treatments and lambing records for sheep farmers.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: ClipboardList, title: "Flock register", body: "Tag number, breed, sex, age and status for every animal." },
  { icon: Scale, title: "Weights & growth", body: "Log weigh-ins and watch daily gain over time." },
  { icon: HeartPulse, title: "Health & treatments", body: "Vaccinations, drenches and withdrawal dates." },
  { icon: Baby, title: "Breeding & lambing", body: "Matings, scans and lambs born per ewe." },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-semibold tracking-tight">Flockbook</span>
        <Button asChild variant={signedIn ? "default" : "outline"} size="sm">
          <Link to={signedIn ? "/dashboard" : "/auth"}>{signedIn ? "Open my farm" : "Sign in"}</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-10 pb-16">
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Sheep farm records</p>
        <h1 className="mt-4 max-w-2xl text-5xl leading-[1.05] sm:text-6xl">
          Every animal, every record, in one book.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Capture weights in the kraal on your phone, review the whole flock at the kitchen table.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to={signedIn ? "/dashboard" : "/auth"}>{signedIn ? "Go to dashboard" : "Get started"}</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-border bg-card/60">
        <div className="mx-auto grid max-w-5xl gap-px overflow-hidden px-6 py-14 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="flex gap-4 py-6 pr-6">
              <f.icon className="mt-1 size-5 shrink-0 text-pasture" aria-hidden />
              <div>
                <h2 className="text-lg">{f.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
