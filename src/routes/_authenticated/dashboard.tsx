import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFarmSummary } from "@/lib/farm.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Flockbook" },
      { name: "description", content: "Flock overview: head count, recent health and lambing records." },
      { property: "og:title", content: "Dashboard — Flockbook" },
      { property: "og:description", content: "Your sheep farm at a glance." },
    ],
  }),
  component: Dashboard,
  errorComponent: ({ error }) => <p role="alert">{error.message}</p>,
});

function Dashboard() {
  const fetchSummary = useServerFn(getFarmSummary);
  const { data } = useSuspenseQuery({ queryKey: ["farm-summary"], queryFn: () => fetchSummary() });

  const active = data.sheep.filter((s) => s.status === "active");
  const ewes = active.filter((s) => s.sex === "ewe").length;
  const rams = active.filter((s) => s.sex === "ram").length;
  const lambsThisYear = data.breeding
    .filter((b) => b.event_type === "lambing")
    .reduce((sum, b) => sum + (b.lambs_alive ?? b.lambs_born ?? 0), 0);
  const tagOf = (id: string) => data.sheep.find((s) => s.id === id)?.tag_number ?? "—";

  const todayIso = new Date().toISOString().slice(0, 10);
  const dueReminders = [...data.reminders].sort((a, b) => a.due_on.localeCompare(b.due_on));
  const overdueCount = dueReminders.filter((r) => r.due_on < todayIso).length;

  const stats = [
    { label: "Active head", value: active.length },
    { label: "Ewes", value: ewes },
    { label: "Rams", value: rams },
    { label: "Lambs (recent)", value: lambsThisYear },
    { label: "Reminders due", value: overdueCount },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">{data.profile?.farm_name ?? "My flock"}</h1>
          <p className="text-sm text-muted-foreground">Everything recorded, at a glance.</p>
        </div>
        <Button asChild>
          <Link to="/flock">Manage flock</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-3xl font-semibold">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dueReminders.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No reminders scheduled. Add due dates for vaccinations, deworming or checkups on an
              animal's page.
            </p>
          )}
          {dueReminders.slice(0, 8).map((r) => {
            const overdue = r.due_on < todayIso;
            return (
              <Link
                key={r.id}
                to="/flock/$sheepId"
                params={{ sheepId: r.sheep_id }}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <span className="font-medium">#{tagOf(r.sheep_id)}</span>{" "}
                  <span className="text-muted-foreground">{r.reminder_type}</span>
                  {r.notes && (
                    <p className="truncate text-xs text-muted-foreground">{r.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={overdue ? "destructive" : "secondary"}>
                    {overdue ? "overdue" : "due"}
                  </Badge>
                  <span className="text-muted-foreground">{r.due_on}</span>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent health records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.health.length === 0 && (
              <p className="text-sm text-muted-foreground">No health records yet.</p>
            )}
            {data.health.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <span className="font-medium">#{tagOf(h.sheep_id)}</span>{" "}
                  <span className="text-muted-foreground">{h.product ?? h.event_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{h.event_type}</Badge>
                  <span className="text-muted-foreground">{h.recorded_on}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent breeding records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.breeding.length === 0 && (
              <p className="text-sm text-muted-foreground">No breeding records yet.</p>
            )}
            {data.breeding.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <span className="font-medium">#{tagOf(b.sheep_id)}</span>{" "}
                  <span className="text-muted-foreground">
                    {b.event_type === "lambing"
                      ? `${b.lambs_alive ?? b.lambs_born ?? 0} lamb(s)`
                      : b.event_type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{b.event_type}</Badge>
                  <span className="text-muted-foreground">{b.recorded_on}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
