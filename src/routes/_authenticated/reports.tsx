import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getReportData } from "@/lib/farm.functions";
import { downloadFile, stamp, toCsv } from "@/lib/export";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports & exports — Flockbook" },
      {
        name: "description",
        content:
          "Charts summarising flock composition, growth, health and lambing, plus CSV and JSON exports of your farm data.",
      },
      { property: "og:title", content: "Reports & exports — Flockbook" },
      {
        property: "og:description",
        content: "Visual summaries of your sheep records and one-click data exports.",
      },
    ],
  }),
  component: ReportsPage,
  errorComponent: ({ error }) => <p role="alert">{error.message}</p>,
});

const CHART = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const RANGES = [
  { value: "all", label: "All time", months: 0 },
  { value: "12", label: "Last 12 months", months: 12 },
  { value: "6", label: "Last 6 months", months: 6 },
  { value: "3", label: "Last 3 months", months: 3 },
] as const;

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function ChartFrame({ children }: { children: React.ReactElement }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-64" aria-hidden />;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function ReportsPage() {
  const fetchReport = useServerFn(getReportData);
  const { data } = useSuspenseQuery({ queryKey: ["report-data"], queryFn: () => fetchReport() });
  const [range, setRange] = useState<string>("all");

  const cutoff = useMemo(() => {
    const months = RANGES.find((r) => r.value === range)?.months ?? 0;
    if (!months) return null;
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString().slice(0, 10);
  }, [range]);

  const inRange = (iso: string) => (cutoff ? iso >= cutoff : true);

  const weights = data.weights.filter((w) => inRange(w.recorded_on));
  const health = data.health.filter((h) => inRange(h.recorded_on));
  const breeding = data.breeding.filter((b) => inRange(b.recorded_on));

  const tagOf = (id: string) => data.sheep.find((s) => s.id === id)?.tag_number ?? "";

  const active = data.sheep.filter((s) => s.status === "active");
  const sexData = (["ewe", "ram", "wether"] as const)
    .map((sex) => ({ name: sex, value: active.filter((s) => s.sex === sex).length }))
    .filter((d) => d.value > 0);

  const statusData = (["active", "sold", "deceased", "culled"] as const)
    .map((status) => ({ name: status, value: data.sheep.filter((s) => s.status === status).length }))
    .filter((d) => d.value > 0);

  const weightTrend = useMemo(() => {
    const buckets = new Map<string, { sum: number; n: number }>();
    for (const w of weights) {
      const k = monthKey(w.recorded_on);
      const b = buckets.get(k) ?? { sum: 0, n: 0 };
      b.sum += Number(w.weight_kg);
      b.n += 1;
      buckets.set(k, b);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, b]) => ({ month, avg: Number((b.sum / b.n).toFixed(1)), count: b.n }));
  }, [weights]);

  const healthData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of health) counts.set(h.event_type, (counts.get(h.event_type) ?? 0) + 1);
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [health]);

  const lambingTrend = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const b of breeding.filter((x) => x.event_type === "lambing")) {
      const k = monthKey(b.recorded_on);
      buckets.set(k, (buckets.get(k) ?? 0) + (b.lambs_alive ?? b.lambs_born ?? 0));
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, lambs]) => ({ month, lambs }));
  }, [breeding]);

  const herdName = (id: string | null) =>
    id ? (data.herds.find((h) => h.id === id)?.name ?? "Unassigned") : "Unassigned";

  // Average daily gain: (last weight − first weight) / days between, per animal.
  const adgRows = useMemo(() => {
    const rows: {
      sheep_id: string;
      tag_number: string;
      name: string;
      herd: string;
      first_kg: number;
      last_kg: number;
      days: number;
      adg_kg: number;
    }[] = [];
    for (const s of data.sheep) {
      const own = weights
        .filter((w) => w.sheep_id === s.id)
        .sort((a, b) => a.recorded_on.localeCompare(b.recorded_on));
      if (own.length < 2) continue;
      const first = own[0]!;
      const last = own[own.length - 1]!;
      const days = Math.round(
        (new Date(last.recorded_on).getTime() - new Date(first.recorded_on).getTime()) / 86400000,
      );
      if (days <= 0) continue;
      rows.push({
        sheep_id: s.id,
        tag_number: s.tag_number,
        name: s.name ?? "",
        herd: herdName(s.herd_id),
        first_kg: Number(first.weight_kg),
        last_kg: Number(last.weight_kg),
        days,
        adg_kg: Number(((Number(last.weight_kg) - Number(first.weight_kg)) / days).toFixed(3)),
      });
    }
    return rows.sort((a, b) => b.adg_kg - a.adg_kg);
  }, [data, weights]);

  const flockAdg = adgRows.length
    ? Number((adgRows.reduce((s, r) => s + r.adg_kg, 0) / adgRows.length).toFixed(3))
    : null;

  const adgByHerd = useMemo(() => {
    const buckets = new Map<string, { sum: number; n: number }>();
    for (const r of adgRows) {
      const b = buckets.get(r.herd) ?? { sum: 0, n: 0 };
      b.sum += r.adg_kg;
      b.n += 1;
      buckets.set(r.herd, b);
    }
    return Array.from(buckets.entries())
      .map(([herd, b]) => ({
        herd,
        adg: Number((b.sum / b.n).toFixed(3)),
        gramsPerDay: Math.round((b.sum / b.n) * 1000),
        animals: b.n,
      }))
      .sort((a, b) => b.adg - a.adg);
  }, [adgRows]);

  const topGainers = adgRows.slice(0, 8).map((r) => ({
    name: `#${r.tag_number}`,
    gramsPerDay: Math.round(r.adg_kg * 1000),
  }));


  const flockSummary = useMemo(
    () =>
      data.sheep.map((s) => {
        const own = data.weights.filter((w) => w.sheep_id === s.id);
        const latest = own[own.length - 1];
        const lambs = data.breeding
          .filter((b) => b.sheep_id === s.id && b.event_type === "lambing")
          .reduce((sum, b) => sum + (b.lambs_alive ?? b.lambs_born ?? 0), 0);
        return {
          tag_number: s.tag_number,
          name: s.name ?? "",
          breed: s.breed ?? "",
          sex: s.sex,
          status: s.status,
          birth_date: s.birth_date ?? "",
          colour: s.colour ?? "",
          latest_weight_kg: latest ? latest.weight_kg : "",
          latest_weighed_on: latest ? latest.recorded_on : "",
          weigh_ins: own.length,
          health_events: data.health.filter((h) => h.sheep_id === s.id).length,
          lambs_recorded: lambs,
          open_reminders: data.reminders.filter(
            (r) => r.sheep_id === s.id && !r.completed_at,
          ).length,
          notes: s.notes ?? "",
        };
      }),
    [data],
  );

  const exports = [
    { label: "Flock summary", rows: flockSummary, file: "flock-summary" },
    {
      label: "Animal register",
      rows: data.sheep.map(({ user_id: _u, id: _i, ...rest }) => rest),
      file: "sheep-register",
    },
    {
      label: "Weight records",
      rows: weights.map((w) => ({
        tag_number: tagOf(w.sheep_id),
        recorded_on: w.recorded_on,
        weight_kg: w.weight_kg,
        notes: w.notes ?? "",
      })),
      file: "weights",
    },
    {
      label: "Health records",
      rows: health.map((h) => ({
        tag_number: tagOf(h.sheep_id),
        recorded_on: h.recorded_on,
        event_type: h.event_type,
        product: h.product ?? "",
        dose: h.dose ?? "",
        withdrawal_until: h.withdrawal_until ?? "",
        notes: h.notes ?? "",
      })),
      file: "health",
    },
    {
      label: "Breeding records",
      rows: breeding.map((b) => ({
        tag_number: tagOf(b.sheep_id),
        recorded_on: b.recorded_on,
        event_type: b.event_type,
        ram_tag: b.ram_tag ?? "",
        lambs_born: b.lambs_born ?? "",
        lambs_alive: b.lambs_alive ?? "",
        notes: b.notes ?? "",
      })),
      file: "breeding",
    },
    {
      label: "Reminders",
      rows: data.reminders.map((r) => ({
        tag_number: tagOf(r.sheep_id),
        reminder_type: r.reminder_type,
        due_on: r.due_on,
        status: r.completed_at ? "done" : "open",
        notes: r.notes ?? "",
      })),
      file: "reminders",
    },
    {
      label: "Average daily gain",
      rows: adgRows.map(({ sheep_id: _s, ...rest }) => rest),
      file: "average-daily-gain",
    },
    {
      label: "Deaths",
      rows: data.deaths
        .filter((d) => inRange(d.died_on))
        .map((d) => ({
          tag_number: tagOf(d.sheep_id),
          died_on: d.died_on,
          cause: d.cause,
          details: d.details ?? "",
          notes: d.notes ?? "",
        })),
      file: "deaths",
    },
    {
      label: "Sales",
      rows: data.sales
        .filter((s) => inRange(s.sold_on))
        .map((s) => ({
          tag_number: tagOf(s.sheep_id),
          sold_on: s.sold_on,
          sale_type: s.sale_type,
          buyer: s.buyer ?? "",
          price: s.price ?? "",
          notes: s.notes ?? "",
        })),
      file: "sales",
    },
  ];


  function exportAllJson() {
    downloadFile(
      `flockbook-export-${stamp()}.json`,
      JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          range: RANGES.find((r) => r.value === range)?.label,
          flock_summary: flockSummary,
          ...Object.fromEntries(exports.slice(1).map((e) => [e.file, e.rows])),
        },
        null,
        2,
      ),
      "application/json",
    );
  }

  const totalLambs = lambingTrend.reduce((s, m) => s + m.lambs, 0);
  const avgWeight = weights.length
    ? (weights.reduce((s, w) => s + Number(w.weight_kg), 0) / weights.length).toFixed(1)
    : "—";

  const kpis = [
    { label: "Animals recorded", value: data.sheep.length },
    { label: "Active head", value: active.length },
    { label: "Avg weight (kg)", value: avgWeight },
    { label: "Flock ADG (g/day)", value: flockAdg !== null ? Math.round(flockAdg * 1000) : "—" },
    { label: "Health events", value: health.length },
    { label: "Lambs recorded", value: totalLambs },
  ];


  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Reports &amp; exports</h1>
          <p className="text-sm text-muted-foreground">
            Visual summaries of your flock, plus downloadable CSV and JSON data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportAllJson} variant="outline">
            <Download className="size-4" aria-hidden />
            Export all (JSON)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-6">
              <p className="text-2xl font-semibold">{k.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {k.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Flock composition</CardTitle>
            <CardDescription>Active animals by sex</CardDescription>
          </CardHeader>
          <CardContent>
            {sexData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active animals yet.</p>
            ) : (
              <ChartFrame>
                <PieChart>
                  <Pie data={sexData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {sexData.map((_, i) => (
                      <Cell key={i} fill={CHART[i % CHART.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status breakdown</CardTitle>
            <CardDescription>All animals by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No animals recorded yet.</p>
            ) : (
              <ChartFrame>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Average weight trend</CardTitle>
            <CardDescription>Mean recorded weight (kg) per month</CardDescription>
          </CardHeader>
          <CardContent>
            {weightTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No weigh-ins in this period.</p>
            ) : (
              <ChartFrame>
                <LineChart data={weightTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Health events</CardTitle>
            <CardDescription>Count by event type</CardDescription>
          </CardHeader>
          <CardContent>
            {healthData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No health records in this period.</p>
            ) : (
              <ChartFrame>
                <BarChart data={healthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Average daily gain by herd</CardTitle>
            <CardDescription>Grams gained per animal per day</CardDescription>
          </CardHeader>
          <CardContent>
            {adgByHerd.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Needs at least two weigh-ins for an animal in this period.
              </p>
            ) : (
              <ChartFrame>
                <BarChart data={adgByHerd}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="herd" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip formatter={(v: number) => `${v} g/day`} />
                  <Bar dataKey="gramsPerDay" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top gaining animals</CardTitle>
            <CardDescription>Best average daily gain (g/day)</CardDescription>
          </CardHeader>
          <CardContent>
            {topGainers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No growth data in this period.</p>
            ) : (
              <ChartFrame>
                <BarChart data={topGainers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip formatter={(v: number) => `${v} g/day`} />
                  <Bar dataKey="gramsPerDay" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartFrame>
            )}
          </CardContent>
        </Card>


        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Lambs per month</CardTitle>
            <CardDescription>Live lambs recorded at lambing events</CardDescription>
          </CardHeader>
          <CardContent>
            {lambingTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lambing records in this period.</p>
            ) : (
              <ChartFrame>
                <BarChart data={lambingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="lambs" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartFrame>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Download your data</CardTitle>
          <CardDescription>
            Spreadsheet-ready CSV files. Record exports follow the selected date range.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {exports.map((e) => (
            <div
              key={e.file}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{e.label}</p>
                <p className="text-xs text-muted-foreground">{e.rows.length} row(s)</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={e.rows.length === 0}
                onClick={() =>
                  downloadFile(
                    `${e.file}-${stamp()}.csv`,
                    toCsv(e.rows as Record<string, unknown>[]),
                    "text/csv",
                  )
                }
              >
                <Download className="size-4" aria-hidden />
                CSV
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
