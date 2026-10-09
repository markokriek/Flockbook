import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  addBreeding,
  addDeath,
  addReminder,
  addSale,
  deleteReminder,
  setParents,
  setReminderDone,
  addHealth,
  addWeight,
  deleteRecord,
  deleteSheep,
  getSheepDetail,
  listHerds,
  listSheep,
  setSheepHerd,
} from "@/lib/farm.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/flock/$sheepId")({
  head: () => ({
    meta: [
      { title: "Animal record — Flockbook" },
      { name: "description", content: "Weights, health treatments and breeding history for one sheep." },
      { property: "og:title", content: "Animal record — Flockbook" },
      { property: "og:description", content: "Full record for a single animal." },
    ],
  }),
  component: SheepDetail,
  errorComponent: ({ error }) => <p role="alert">{error.message}</p>,
  notFoundComponent: () => <p>Animal not found.</p>,
});

const today = () => new Date().toISOString().slice(0, 10);
const healthTypes = ["vaccination", "drench", "treatment", "illness", "shearing", "other"] as const;
const breedingTypes = ["mating", "scan", "lambing"] as const;
const reminderTypes = ["vaccination", "deworming", "checkup", "other"] as const;
const deathCauses = ["illness", "predation", "accident", "lambing", "age", "unknown", "other"] as const;
const saleTypes = ["private", "auction", "abattoir", "breeding_stock", "other"] as const;
const saleTypeLabels: Record<(typeof saleTypes)[number], string> = {
  private: "Private sale",
  auction: "Auction",
  abattoir: "Abattoir",
  breeding_stock: "Breeding stock",
  other: "Other",
};

type RecordTable =
  | "weight_records"
  | "health_records"
  | "breeding_records"
  | "death_records"
  | "sale_records";

function SheepDetail() {
  const { sheepId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchDetail = useServerFn(getSheepDetail);
  const saveWeight = useServerFn(addWeight);
  const saveHealth = useServerFn(addHealth);
  const saveBreeding = useServerFn(addBreeding);
  const removeRecord = useServerFn(deleteRecord);
  const removeSheep = useServerFn(deleteSheep);
  const saveReminder = useServerFn(addReminder);
  const markReminder = useServerFn(setReminderDone);
  const dropReminder = useServerFn(deleteReminder);
  const fetchHerds = useServerFn(listHerds);
  const moveHerd = useServerFn(setSheepHerd);
  const saveDeath = useServerFn(addDeath);
  const saveSale = useServerFn(addSale);
  const saveParents = useServerFn(setParents);
  const fetchSheep = useServerFn(listSheep);

  const { data } = useSuspenseQuery({
    queryKey: ["sheep", sheepId],
    queryFn: () => fetchDetail({ data: { id: sheepId } }),
  });
  const { data: herds } = useSuspenseQuery({ queryKey: ["herds"], queryFn: () => fetchHerds() });
  const { data: allSheep } = useSuspenseQuery({
    queryKey: ["sheep"],
    queryFn: () => fetchSheep(),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["sheep", sheepId] });
    queryClient.invalidateQueries({ queryKey: ["sheep"] });
    queryClient.invalidateQueries({ queryKey: ["farm-summary"] });
    queryClient.invalidateQueries({ queryKey: ["herds"] });
    queryClient.invalidateQueries({ queryKey: ["unassigned-sheep"] });
  };

  const moveHerdMutation = useMutation({
    mutationFn: (herdId: string | null) =>
      moveHerd({ data: { sheep_id: sheepId, herd_id: herdId } }),
    onSuccess: () => {
      toast.success("Herd updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const [weight, setWeight] = useState({ recorded_on: today(), weight_kg: "", notes: "" });
  const [health, setHealth] = useState({
    recorded_on: today(),
    event_type: "vaccination" as (typeof healthTypes)[number],
    product: "",
    dose: "",
    withdrawal_until: "",
    notes: "",
  });
  const [reminder, setReminder] = useState({
    reminder_type: "vaccination" as (typeof reminderTypes)[number],
    due_on: "",
    notes: "",
  });
  const [breeding, setBreeding] = useState({
    recorded_on: today(),
    event_type: "mating" as (typeof breedingTypes)[number],
    ram_tag: "",
    lambs_born: "",
    lambs_alive: "",
    notes: "",
  });
  const [death, setDeath] = useState({
    died_on: today(),
    cause: "unknown" as (typeof deathCauses)[number],
    details: "",
    notes: "",
  });
  const [sale, setSale] = useState({
    sold_on: today(),
    buyer: "",
    price: "",
    sale_type: "private" as (typeof saleTypes)[number],
    notes: "",
  });

  const deathMutation = useMutation({
    mutationFn: () => saveDeath({ data: { sheep_id: sheepId, ...death } }),
    onSuccess: () => {
      toast.success("Death recorded");
      setDeath({ died_on: today(), cause: "unknown", details: "", notes: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saleMutation = useMutation({
    mutationFn: () =>
      saveSale({
        data: {
          sheep_id: sheepId,
          sold_on: sale.sold_on,
          buyer: sale.buyer,
          price: sale.price === "" ? null : Number(sale.price),
          sale_type: sale.sale_type,
          notes: sale.notes,
        },
      }),
    onSuccess: () => {
      toast.success("Sale recorded");
      setSale({ sold_on: today(), buyer: "", price: "", sale_type: "private", notes: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const parentsMutation = useMutation({
    mutationFn: (input: { dam_id: string | null; sire_id: string | null }) =>
      saveParents({ data: { sheep_id: sheepId, ...input } }),
    onSuccess: () => {
      toast.success("Parentage updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });



  const weightMutation = useMutation({
    mutationFn: () =>
      saveWeight({
        data: {
          sheep_id: sheepId,
          recorded_on: weight.recorded_on,
          weight_kg: Number(weight.weight_kg),
          notes: weight.notes,
        },
      }),
    onSuccess: () => {
      toast.success("Weight recorded");
      setWeight({ recorded_on: today(), weight_kg: "", notes: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const healthMutation = useMutation({
    mutationFn: () => saveHealth({ data: { sheep_id: sheepId, ...health } }),
    onSuccess: () => {
      toast.success("Health record saved");
      setHealth({
        recorded_on: today(),
        event_type: "vaccination",
        product: "",
        dose: "",
        withdrawal_until: "",
        notes: "",
      });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const breedingMutation = useMutation({
    mutationFn: () =>
      saveBreeding({
        data: {
          sheep_id: sheepId,
          recorded_on: breeding.recorded_on,
          event_type: breeding.event_type,
          ram_tag: breeding.ram_tag,
          lambs_born: breeding.lambs_born === "" ? null : Number(breeding.lambs_born),
          lambs_alive: breeding.lambs_alive === "" ? null : Number(breeding.lambs_alive),
          notes: breeding.notes,
        },
      }),
    onSuccess: () => {
      toast.success("Breeding record saved");
      setBreeding({
        recorded_on: today(),
        event_type: "mating",
        ram_tag: "",
        lambs_born: "",
        lambs_alive: "",
        notes: "",
      });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reminderMutation = useMutation({
    mutationFn: () => saveReminder({ data: { sheep_id: sheepId, ...reminder } }),
    onSuccess: () => {
      toast.success("Reminder scheduled");
      setReminder({ reminder_type: "vaccination", due_on: "", notes: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleReminder = useMutation({
    mutationFn: (input: { id: string; done: boolean }) => markReminder({ data: input }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeReminder = useMutation({
    mutationFn: (id: string) => dropReminder({ data: { id } }),
    onSuccess: () => {
      toast.success("Reminder removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRow = useMutation({
    mutationFn: (input: {
      id: string;
      table: RecordTable;
    }) => removeRecord({ data: input }),
    onSuccess: () => {
      toast.success("Record deleted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cullSheep = useMutation({
    mutationFn: () => removeSheep({ data: { id: sheepId } }),
    onSuccess: () => {
      toast.success("Animal removed");
      queryClient.invalidateQueries({ queryKey: ["sheep"] });
      navigate({ to: "/flock" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sheep = data.sheep;
  if (!sheep) return <p>Animal not found.</p>;

  const latest = data.weights.at(-1);
  const first = data.weights[0];
  const gain =
    latest && first && latest.id !== first.id
      ? (
          ((Number(latest.weight_kg) - Number(first.weight_kg)) *
            1000) /
          Math.max(
            1,
            (new Date(latest.recorded_on).getTime() - new Date(first.recorded_on).getTime()) /
              86400000,
          )
        ).toFixed(0)
      : null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/flock">
          <ArrowLeft className="size-4" aria-hidden /> Back to flock
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl">#{sheep.tag_number}</h1>
          <p className="text-sm text-muted-foreground">
            {[sheep.name, sheep.breed, sheep.sex, sheep.colour].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{sheep.status}</Badge>
            {sheep.birth_date && <Badge variant="outline">born {sheep.birth_date}</Badge>}
            {latest && <Badge variant="outline">{Number(latest.weight_kg)} kg</Badge>}
            {gain && <Badge variant="outline">{gain} g/day</Badge>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => cullSheep.mutate()}>
          <Trash2 className="size-4" aria-hidden /> Delete animal
        </Button>
      </div>

      {sheep.notes && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">{sheep.notes}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Herd</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1 space-y-1.5">
            <Label>Current herd</Label>
            <Select
              value={sheep.herd_id ?? "none"}
              onValueChange={(v) => moveHerdMutation.mutate(v === "none" ? null : v)}
            >
              <SelectTrigger aria-label="Move this animal to a herd">
                <SelectValue placeholder="No herd" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No herd</SelectItem>
                {herds.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {sheep.herd_id && (
            <Button asChild variant="outline" size="sm">
              <Link to="/herds/$herdId" params={{ herdId: sheep.herd_id }}>
                Open herd
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>


      <Tabs defaultValue="weights">
        <TabsList className="flex-wrap">
          <TabsTrigger value="weights">Weights</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="breeding">Breeding</TabsTrigger>
          <TabsTrigger value="parentage">Parentage</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="deaths">Deaths</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="weights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add weigh-in</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="w-date">Date</Label>
                <Input
                  id="w-date"
                  type="date"
                  value={weight.recorded_on}
                  onChange={(e) => setWeight({ ...weight, recorded_on: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-kg">Weight (kg)</Label>
                <Input
                  id="w-kg"
                  type="number"
                  step="0.1"
                  min="0"
                  value={weight.weight_kg}
                  onChange={(e) => setWeight({ ...weight, weight_kg: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-notes">Notes</Label>
                <Input
                  id="w-notes"
                  value={weight.notes}
                  maxLength={500}
                  onChange={(e) => setWeight({ ...weight, notes: e.target.value })}
                />
              </div>
              <div className="sm:col-span-3">
                <Button
                  onClick={() => weightMutation.mutate()}
                  disabled={weightMutation.isPending || !weight.weight_kg}
                >
                  Save weight
                </Button>
              </div>
            </CardContent>
          </Card>

          <RecordList
            empty="No weigh-ins recorded yet."
            rows={[...data.weights].reverse().map((w) => ({
              id: w.id,
              date: w.recorded_on,
              title: `${Number(w.weight_kg)} kg`,
              detail: w.notes ?? "",
              table: "weight_records" as const,
            }))}
            onDelete={(row) => deleteRow.mutate({ id: row.id, table: row.table })}
          />
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add health record</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="h-date">Date</Label>
                <Input
                  id="h-date"
                  type="date"
                  value={health.recorded_on}
                  onChange={(e) => setHealth({ ...health, recorded_on: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={health.event_type}
                  onValueChange={(v) =>
                    setHealth({ ...health, event_type: v as (typeof healthTypes)[number] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {healthTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-product">Product</Label>
                <Input
                  id="h-product"
                  value={health.product}
                  maxLength={120}
                  onChange={(e) => setHealth({ ...health, product: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-dose">Dose</Label>
                <Input
                  id="h-dose"
                  value={health.dose}
                  maxLength={60}
                  onChange={(e) => setHealth({ ...health, dose: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-with">Withdrawal until</Label>
                <Input
                  id="h-with"
                  type="date"
                  value={health.withdrawal_until}
                  onChange={(e) => setHealth({ ...health, withdrawal_until: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-notes">Notes</Label>
                <Input
                  id="h-notes"
                  value={health.notes}
                  maxLength={500}
                  onChange={(e) => setHealth({ ...health, notes: e.target.value })}
                />
              </div>
              <div className="sm:col-span-3">
                <Button onClick={() => healthMutation.mutate()} disabled={healthMutation.isPending}>
                  Save health record
                </Button>
              </div>
            </CardContent>
          </Card>

          <RecordList
            empty="No health records yet."
            rows={data.health.map((h) => ({
              id: h.id,
              date: h.recorded_on,
              title: `${h.event_type}${h.product ? ` — ${h.product}` : ""}`,
              detail: [h.dose, h.withdrawal_until ? `withdrawal to ${h.withdrawal_until}` : "", h.notes]
                .filter(Boolean)
                .join(" · "),
              table: "health_records" as const,
            }))}
            onDelete={(row) => deleteRow.mutate({ id: row.id, table: row.table })}
          />
        </TabsContent>

        <TabsContent value="breeding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add breeding record</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-date">Date</Label>
                <Input
                  id="b-date"
                  type="date"
                  value={breeding.recorded_on}
                  onChange={(e) => setBreeding({ ...breeding, recorded_on: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={breeding.event_type}
                  onValueChange={(v) =>
                    setBreeding({ ...breeding, event_type: v as (typeof breedingTypes)[number] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {breedingTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-ram">Ram tag</Label>
                <Input
                  id="b-ram"
                  value={breeding.ram_tag}
                  maxLength={40}
                  onChange={(e) => setBreeding({ ...breeding, ram_tag: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-born">Lambs born</Label>
                <Input
                  id="b-born"
                  type="number"
                  min="0"
                  max="20"
                  value={breeding.lambs_born}
                  onChange={(e) => setBreeding({ ...breeding, lambs_born: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-alive">Lambs alive</Label>
                <Input
                  id="b-alive"
                  type="number"
                  min="0"
                  max="20"
                  value={breeding.lambs_alive}
                  onChange={(e) => setBreeding({ ...breeding, lambs_alive: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-notes">Notes</Label>
                <Input
                  id="b-notes"
                  value={breeding.notes}
                  maxLength={500}
                  onChange={(e) => setBreeding({ ...breeding, notes: e.target.value })}
                />
              </div>
              <div className="sm:col-span-3">
                <Button
                  onClick={() => breedingMutation.mutate()}
                  disabled={breedingMutation.isPending}
                >
                  Save breeding record
                </Button>
              </div>
            </CardContent>
          </Card>

          <RecordList
            empty="No breeding records yet."
            rows={data.breeding.map((b) => ({
              id: b.id,
              date: b.recorded_on,
              title: b.event_type,
              detail: [
                b.ram_tag ? `ram #${b.ram_tag}` : "",
                b.lambs_born !== null ? `${b.lambs_born} born` : "",
                b.lambs_alive !== null ? `${b.lambs_alive} alive` : "",
                b.notes,
              ]
                .filter(Boolean)
                .join(" · "),
              table: "breeding_records" as const,
            }))}
            onDelete={(row) => deleteRow.mutate({ id: row.id, table: row.table })}
          />
        </TabsContent>
        <TabsContent value="reminders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule a reminder</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={reminder.reminder_type}
                  onValueChange={(v) =>
                    setReminder({ ...reminder, reminder_type: v as (typeof reminderTypes)[number] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reminderTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-due">Due date</Label>
                <Input
                  id="r-due"
                  type="date"
                  value={reminder.due_on}
                  onChange={(e) => setReminder({ ...reminder, due_on: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-notes">Notes</Label>
                <Input
                  id="r-notes"
                  value={reminder.notes}
                  maxLength={500}
                  onChange={(e) => setReminder({ ...reminder, notes: e.target.value })}
                />
              </div>
              <div className="sm:col-span-3">
                <Button
                  onClick={() => reminderMutation.mutate()}
                  disabled={reminderMutation.isPending || !reminder.due_on}
                >
                  Save reminder
                </Button>
              </div>
            </CardContent>
          </Card>

          {data.reminders.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">
              No reminders yet. Enter a due date and this animal shows up on your dashboard when it
              falls due.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {data.reminders.map((r) => {
                const done = Boolean(r.completed_at);
                const overdue = !done && r.due_on < today();
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Checkbox
                        checked={done}
                        aria-label="Mark reminder done"
                        onCheckedChange={(v) =>
                          toggleReminder.mutate({ id: r.id, done: v === true })
                        }
                      />
                      <div className="min-w-0">
                        <p
                          className={
                            done ? "text-sm font-medium line-through opacity-60" : "text-sm font-medium"
                          }
                        >
                          {r.reminder_type}
                        </p>
                        {r.notes && (
                          <p className="truncate text-xs text-muted-foreground">{r.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={done ? "outline" : overdue ? "destructive" : "secondary"}>
                        {done ? "done" : overdue ? "overdue" : "due"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{r.due_on}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete reminder"
                        onClick={() => removeReminder.mutate(r.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="parentage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Link this lamb to its parents</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mother (dam)</Label>
                <Select
                  value={sheep.dam_id ?? "none"}
                  onValueChange={(v) =>
                    parentsMutation.mutate({
                      dam_id: v === "none" ? null : v,
                      sire_id: sheep.sire_id ?? null,
                    })
                  }
                >
                  <SelectTrigger aria-label="Select mother">
                    <SelectValue placeholder="Not recorded" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not recorded</SelectItem>
                    {allSheep
                      .filter((s) => s.id !== sheepId && s.sex === "ewe")
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          #{s.tag_number}
                          {s.name ? ` — ${s.name}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Father (sire)</Label>
                <Select
                  value={sheep.sire_id ?? "none"}
                  onValueChange={(v) =>
                    parentsMutation.mutate({
                      dam_id: sheep.dam_id ?? null,
                      sire_id: v === "none" ? null : v,
                    })
                  }
                >
                  <SelectTrigger aria-label="Select father">
                    <SelectValue placeholder="Not recorded" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not recorded</SelectItem>
                    {allSheep
                      .filter((s) => s.id !== sheepId && s.sex === "ram")
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          #{s.tag_number}
                          {s.name ? ` — ${s.name}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {data.parents.length > 0 && (
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  {data.parents.map((p) => (
                    <Button key={p.id} asChild variant="outline" size="sm">
                      <Link to="/flock/$sheepId" params={{ sheepId: p.id }}>
                        {p.sex === "ewe" ? "Dam" : "Sire"} #{p.tag_number}
                      </Link>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lambs ({data.offspring.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.offspring.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No lambs linked yet. Open a lamb&apos;s record and pick this animal as its parent.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.offspring.map((lamb) => (
                    <li key={lamb.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          #{lamb.tag_number}
                          {lamb.name ? ` — ${lamb.name}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[lamb.sex, lamb.birth_date ? `born ${lamb.birth_date}` : "", lamb.status]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/flock/$sheepId" params={{ sheepId: lamb.id }}>
                          Open
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deaths" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record a death</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="d-date">Date of death</Label>
                <Input
                  id="d-date"
                  type="date"
                  value={death.died_on}
                  onChange={(e) => setDeath({ ...death, died_on: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cause</Label>
                <Select
                  value={death.cause}
                  onValueChange={(v) =>
                    setDeath({ ...death, cause: v as (typeof deathCauses)[number] })
                  }
                >
                  <SelectTrigger aria-label="Cause of death">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deathCauses.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-details">How it happened</Label>
                <Input
                  id="d-details"
                  value={death.details}
                  maxLength={500}
                  placeholder="e.g. jackal attack in the north camp"
                  onChange={(e) => setDeath({ ...death, details: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-notes">Notes</Label>
                <Input
                  id="d-notes"
                  value={death.notes}
                  maxLength={500}
                  onChange={(e) => setDeath({ ...death, notes: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => deathMutation.mutate()} disabled={deathMutation.isPending}>
                  Save death record
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Saving this also marks the animal as deceased.
                </p>
              </div>
            </CardContent>
          </Card>

          <RecordList
            empty="No death recorded for this animal."
            rows={data.deaths.map((d) => ({
              id: d.id,
              date: d.died_on,
              title: d.cause,
              detail: [d.details, d.notes].filter(Boolean).join(" · "),
              table: "death_records" as const,
            }))}
            onDelete={(row) => deleteRow.mutate({ id: row.id, table: row.table })}
          />
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record a sale</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="s-date">Date sold</Label>
                <Input
                  id="s-date"
                  type="date"
                  value={sale.sold_on}
                  onChange={(e) => setSale({ ...sale, sold_on: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type of sale</Label>
                <Select
                  value={sale.sale_type}
                  onValueChange={(v) =>
                    setSale({ ...sale, sale_type: v as (typeof saleTypes)[number] })
                  }
                >
                  <SelectTrigger aria-label="Type of sale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {saleTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {saleTypeLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-buyer">Sold to</Label>
                <Input
                  id="s-buyer"
                  value={sale.buyer}
                  maxLength={120}
                  onChange={(e) => setSale({ ...sale, buyer: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-price">Price received</Label>
                <Input
                  id="s-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={sale.price}
                  onChange={(e) => setSale({ ...sale, price: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="s-notes">Notes</Label>
                <Input
                  id="s-notes"
                  value={sale.notes}
                  maxLength={500}
                  onChange={(e) => setSale({ ...sale, notes: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => saleMutation.mutate()} disabled={saleMutation.isPending}>
                  Save sale record
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Saving this also marks the animal as sold.
                </p>
              </div>
            </CardContent>
          </Card>

          <RecordList
            empty="No sales recorded for this animal."
            rows={data.sales.map((s) => ({
              id: s.id,
              date: s.sold_on,
              title: `${saleTypeLabels[s.sale_type]}${s.price !== null ? ` — ${Number(s.price).toFixed(2)}` : ""}`,
              detail: [s.buyer ? `to ${s.buyer}` : "", s.notes].filter(Boolean).join(" · "),
              table: "sale_records" as const,
            }))}
            onDelete={(row) => deleteRow.mutate({ id: row.id, table: row.table })}
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}

type Row = {
  id: string;
  date: string;
  title: string;
  detail: string;
  table: RecordTable;
};

function RecordList({
  rows,
  empty,
  onDelete,
}: {
  rows: Row[];
  empty: string;
  onDelete: (row: Row) => void;
}) {
  if (rows.length === 0) {
    return <p className="px-1 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{row.title}</p>
            {row.detail && <p className="truncate text-xs text-muted-foreground">{row.detail}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-muted-foreground">{row.date}</span>
            <Button variant="ghost" size="icon" onClick={() => onDelete(row)} aria-label="Delete record">
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
