import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  addGrazing,
  addGrazingReminder,
  addHerdHealth,
  addHerdReminder,
  completeGrazingReminder,
  deleteGrazing,
  deleteGrazingReminder,
  deleteHerd,
  endGrazing,
  getHerdDetail,
  listHerds,
  listUnassignedSheep,
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
import { ArrowLeft, ArrowRightLeft, CalendarClock, Check, MapPin, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/herds/$herdId")({
  head: () => ({
    meta: [
      { title: "Herd record — Flockbook" },
      {
        name: "description",
        content: "Members, grazing rotation, vaccinations and reminders for one herd.",
      },
      { property: "og:title", content: "Herd record — Flockbook" },
      { property: "og:description", content: "Manage a herd's animals, grazing and treatments together." },
    ],
  }),
  component: HerdDetail,
  errorComponent: ({ error }) => <p role="alert">{error.message}</p>,
  notFoundComponent: () => <p>Herd not found.</p>,
});

const today = () => new Date().toISOString().slice(0, 10);
const healthTypes = ["vaccination", "drench", "treatment", "illness", "shearing", "other"] as const;
const reminderTypes = ["vaccination", "deworming", "checkup", "other"] as const;

function HerdDetail() {
  const { herdId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchDetail = useServerFn(getHerdDetail);
  const fetchUnassigned = useServerFn(listUnassignedSheep);
  const fetchHerds = useServerFn(listHerds);
  const assign = useServerFn(setSheepHerd);
  const saveGrazing = useServerFn(addGrazing);
  const closeGrazing = useServerFn(endGrazing);
  const dropGrazing = useServerFn(deleteGrazing);
  const saveMoveReminder = useServerFn(addGrazingReminder);
  const doneMoveReminder = useServerFn(completeGrazingReminder);
  const dropMoveReminder = useServerFn(deleteGrazingReminder);
  const saveHerdHealth = useServerFn(addHerdHealth);
  const saveHerdReminder = useServerFn(addHerdReminder);
  const removeHerd = useServerFn(deleteHerd);

  const { data } = useSuspenseQuery({
    queryKey: ["herd", herdId],
    queryFn: () => fetchDetail({ data: { id: herdId } }),
  });
  const { data: unassigned } = useSuspenseQuery({
    queryKey: ["unassigned-sheep"],
    queryFn: () => fetchUnassigned(),
  });
  const { data: allHerds } = useSuspenseQuery({
    queryKey: ["herds"],
    queryFn: () => fetchHerds(),
  });
  const otherHerds = allHerds.filter((h) => h.id !== herdId);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["herd", herdId] });
    queryClient.invalidateQueries({ queryKey: ["unassigned-sheep"] });
    queryClient.invalidateQueries({ queryKey: ["herds"] });
    queryClient.invalidateQueries({ queryKey: ["sheep"] });
    queryClient.invalidateQueries({ queryKey: ["farm-summary"] });
  };

  const [addMember, setAddMember] = useState("");
  const [moveAllTarget, setMoveAllTarget] = useState("");
  const [grazing, setGrazing] = useState({
    paddock: "",
    moved_in_on: today(),
    moved_out_on: "",
    notes: "",
  });
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
  const [moveReminder, setMoveReminder] = useState({
    target_paddock: "",
    due_on: "",
    notes: "",
  });

  const onError = (e: Error) => toast.error(e.message);

  const assignMutation = useMutation({
    mutationFn: (sheepId: string) => assign({ data: { sheep_id: sheepId, herd_id: herdId } }),
    onSuccess: () => {
      toast.success("Animal added to herd");
      setAddMember("");
      refresh();
    },
    onError,
  });

  const unassignMutation = useMutation({
    mutationFn: (sheepId: string) => assign({ data: { sheep_id: sheepId, herd_id: null } }),
    onSuccess: () => {
      toast.success("Animal removed from herd");
      refresh();
    },
    onError,
  });

  const moveMutation = useMutation({
    mutationFn: (vars: { sheepId: string; targetHerdId: string }) =>
      assign({ data: { sheep_id: vars.sheepId, herd_id: vars.targetHerdId } }),
    onSuccess: () => {
      toast.success("Animal moved to the other herd");
      refresh();
    },
    onError,
  });

  const moveAllMutation = useMutation({
    mutationFn: async (targetHerdId: string) => {
      for (const m of data.members) {
        await assign({ data: { sheep_id: m.id, herd_id: targetHerdId } });
      }
      return { ok: true };
    },
    onSuccess: () => {
      toast.success("Whole herd moved");
      setMoveAllTarget("");
      refresh();
    },
    onError,
  });



  const grazingMutation = useMutation({
    mutationFn: () => saveGrazing({ data: { herd_id: herdId, ...grazing } }),
    onSuccess: () => {
      toast.success("Grazing move recorded");
      setGrazing({ paddock: "", moved_in_on: today(), moved_out_on: "", notes: "" });
      refresh();
    },
    onError,
  });

  const endGrazingMutation = useMutation({
    mutationFn: (id: string) => closeGrazing({ data: { id, moved_out_on: today() } }),
    onSuccess: () => {
      toast.success("Marked as moved out");
      refresh();
    },
    onError,
  });

  const deleteGrazingMutation = useMutation({
    mutationFn: (id: string) => dropGrazing({ data: { id } }),
    onSuccess: refresh,
    onError,
  });

  const moveReminderMutation = useMutation({
    mutationFn: () => saveMoveReminder({ data: { herd_id: herdId, ...moveReminder } }),
    onSuccess: () => {
      toast.success("Move reminder scheduled");
      setMoveReminder({ target_paddock: "", due_on: "", notes: "" });
      refresh();
    },
    onError,
  });

  const completeMoveReminderMutation = useMutation({
    mutationFn: (id: string) => doneMoveReminder({ data: { id } }),
    onSuccess: () => {
      toast.success("Move marked as done");
      refresh();
    },
    onError,
  });

  const deleteMoveReminderMutation = useMutation({
    mutationFn: (id: string) => dropMoveReminder({ data: { id } }),
    onSuccess: refresh,
    onError,
  });

  const healthMutation = useMutation({
    mutationFn: () => saveHerdHealth({ data: { herd_id: herdId, ...health } }),
    onSuccess: (res) => {
      toast.success(`Recorded for ${res.count} animal(s)`);
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
    onError,
  });

  const reminderMutation = useMutation({
    mutationFn: () => saveHerdReminder({ data: { herd_id: herdId, ...reminder } }),
    onSuccess: (res) => {
      toast.success(`Reminder set for ${res.count} animal(s)`);
      setReminder({ reminder_type: "vaccination", due_on: "", notes: "" });
      refresh();
    },
    onError,
  });

  const deleteHerdMutation = useMutation({
    mutationFn: () => removeHerd({ data: { id: herdId } }),
    onSuccess: () => {
      toast.success("Herd deleted");
      refresh();
      navigate({ to: "/herds" });
    },
    onError,
  });

  if (!data.herd) return <p>Herd not found.</p>;

  const tagOf = (sheepId: string) =>
    data.members.find((m) => m.id === sheepId)?.tag_number ?? "—";
  const currentPaddock = data.grazing.find((g) => !g.moved_out_on);
  const openMoves = data.grazingReminders.filter((r) => !r.completed_at);
  const lastVaccination = data.health.find((h) => h.event_type === "vaccination");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/herds"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden /> All herds
          </Link>
          <h1 className="mt-1 text-3xl">{data.herd.name}</h1>
          <p className="text-sm text-muted-foreground">
            {data.members.length} animal(s)
            {data.herd.description ? ` · ${data.herd.description}` : ""}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => deleteHerdMutation.mutate()}
          disabled={deleteHerdMutation.isPending}
        >
          <Trash2 className="size-4" aria-hidden /> Delete herd
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Current paddock</CardTitle>
          </CardHeader>
          <CardContent className="text-xl">
            {currentPaddock ? currentPaddock.paddock : "Not grazing"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Last vaccination</CardTitle>
          </CardHeader>
          <CardContent className="text-xl">
            {lastVaccination ? lastVaccination.recorded_on : "None"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Open reminders</CardTitle>
          </CardHeader>
          <CardContent className="text-xl">{data.reminders.length}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="grazing">Grazing</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add an animal</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="min-w-52 flex-1 space-y-1.5">
                <Label>Unassigned animals</Label>
                <Select value={addMember} onValueChange={setAddMember}>
                  <SelectTrigger>
                    <SelectValue placeholder={unassigned.length ? "Choose animal" : "None available"} />
                  </SelectTrigger>
                  <SelectContent>
                    {unassigned.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        #{s.tag_number} {s.name ? `· ${s.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => assignMutation.mutate(addMember)}
                disabled={!addMember || assignMutation.isPending}
              >
                Add to herd
              </Button>
            </CardContent>
          </Card>

          {otherHerds.length > 0 && data.members.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Move the whole herd</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="min-w-52 flex-1 space-y-1.5">
                  <Label>Destination herd</Label>
                  <Select value={moveAllTarget} onValueChange={setMoveAllTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose herd" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherHerds.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={() => moveAllMutation.mutate(moveAllTarget)}
                  disabled={!moveAllTarget || moveAllMutation.isPending}
                >
                  <ArrowRightLeft className="size-4" aria-hidden />
                  {moveAllMutation.isPending
                    ? "Moving…"
                    : `Move ${data.members.length} animal(s)`}
                </Button>
              </CardContent>
            </Card>
          )}

          {data.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No animals in this herd yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {data.members.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <Link
                    to="/flock/$sheepId"
                    params={{ sheepId: m.id }}
                    className="text-sm hover:underline"
                  >
                    <span className="font-medium">#{m.tag_number}</span>{" "}
                    <span className="text-muted-foreground">
                      {[m.name, m.sex].filter(Boolean).join(" · ")}
                    </span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.status === "active" ? "secondary" : "outline"}>{m.status}</Badge>
                    {otherHerds.length > 0 && (
                      <Select
                        value=""
                        onValueChange={(v) =>
                          moveMutation.mutate({ sheepId: m.id, targetHerdId: v })
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-36"
                          aria-label={`Move ${m.tag_number} to another herd`}
                        >
                          <SelectValue placeholder="Move to…" />
                        </SelectTrigger>
                        <SelectContent>
                          {otherHerds.map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              {h.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unassignMutation.mutate(m.id)}
                      aria-label={`Remove ${m.tag_number} from herd`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}

            </div>
          )}
        </TabsContent>

        <TabsContent value="grazing" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record a grazing move</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="paddock">Paddock *</Label>
                <Input
                  id="paddock"
                  value={grazing.paddock}
                  maxLength={80}
                  onChange={(e) => setGrazing({ ...grazing, paddock: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moved-in">Moved in</Label>
                <Input
                  id="moved-in"
                  type="date"
                  value={grazing.moved_in_on}
                  onChange={(e) => setGrazing({ ...grazing, moved_in_on: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moved-out">Moved out (optional)</Label>
                <Input
                  id="moved-out"
                  type="date"
                  value={grazing.moved_out_on}
                  onChange={(e) => setGrazing({ ...grazing, moved_out_on: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="grazing-notes">Notes</Label>
                <Textarea
                  id="grazing-notes"
                  value={grazing.notes}
                  maxLength={500}
                  placeholder="Pasture condition, supplement feeding…"
                  onChange={(e) => setGrazing({ ...grazing, notes: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  onClick={() => grazingMutation.mutate()}
                  disabled={grazingMutation.isPending || !grazing.paddock.trim()}
                >
                  {grazingMutation.isPending ? "Saving…" : "Save move"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <CalendarClock className="mr-1 inline size-4" aria-hidden /> Schedule a camp move
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="move-target">Move to camp / paddock</Label>
                <Input
                  id="move-target"
                  value={moveReminder.target_paddock}
                  maxLength={80}
                  placeholder="e.g. North camp"
                  onChange={(e) =>
                    setMoveReminder({ ...moveReminder, target_paddock: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="move-due">Move on *</Label>
                <Input
                  id="move-due"
                  type="date"
                  value={moveReminder.due_on}
                  onChange={(e) => setMoveReminder({ ...moveReminder, due_on: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="move-notes">Notes</Label>
                <Textarea
                  id="move-notes"
                  value={moveReminder.notes}
                  maxLength={500}
                  placeholder="Rest period, water check, fencing…"
                  onChange={(e) => setMoveReminder({ ...moveReminder, notes: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  onClick={() => moveReminderMutation.mutate()}
                  disabled={moveReminderMutation.isPending || !moveReminder.due_on}
                >
                  {moveReminderMutation.isPending ? "Saving…" : "Set move reminder"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Upcoming camp moves</h2>
            {openMoves.length === 0 ? (
              <p className="text-sm text-muted-foreground">No move reminders scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {openMoves.map((r) => {
                  const overdue = r.due_on <= today();
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          <CalendarClock className="mr-1 inline size-4" aria-hidden />
                          Move to {r.target_paddock || "next camp"}
                        </p>
                        <p className="text-muted-foreground">
                          Due {r.due_on}
                          {r.notes ? ` · ${r.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {overdue && <Badge variant="destructive">Due</Badge>}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => completeMoveReminderMutation.mutate(r.id)}
                        >
                          <Check className="size-4" aria-hidden /> Done
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMoveReminderMutation.mutate(r.id)}
                          aria-label="Delete move reminder"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <h2 className="text-sm font-medium text-muted-foreground">Grazing history</h2>

          {data.grazing.length === 0 ? (
            <p className="text-sm text-muted-foreground">No grazing history recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.grazing.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      <MapPin className="mr-1 inline size-4" aria-hidden />
                      {g.paddock}
                    </p>
                    <p className="text-muted-foreground">
                      {g.moved_in_on} → {g.moved_out_on ?? "present"}
                      {g.notes ? ` · ${g.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!g.moved_out_on && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => endGrazingMutation.mutate(g.id)}
                      >
                        Mark moved out
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteGrazingMutation.mutate(g.id)}
                      aria-label="Delete grazing record"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="health" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Record for the whole herd ({data.members.length} animal(s))
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Event type</Label>
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
                <Label htmlFor="h-date">Date</Label>
                <Input
                  id="h-date"
                  type="date"
                  value={health.recorded_on}
                  onChange={(e) => setHealth({ ...health, recorded_on: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-product">Product</Label>
                <Input
                  id="h-product"
                  value={health.product}
                  maxLength={80}
                  onChange={(e) => setHealth({ ...health, product: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-dose">Dose</Label>
                <Input
                  id="h-dose"
                  value={health.dose}
                  maxLength={40}
                  onChange={(e) => setHealth({ ...health, dose: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-withdrawal">Withdrawal until</Label>
                <Input
                  id="h-withdrawal"
                  type="date"
                  value={health.withdrawal_until}
                  onChange={(e) => setHealth({ ...health, withdrawal_until: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="h-notes">Notes</Label>
                <Textarea
                  id="h-notes"
                  value={health.notes}
                  maxLength={500}
                  onChange={(e) => setHealth({ ...health, notes: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  onClick={() => healthMutation.mutate()}
                  disabled={healthMutation.isPending || data.members.length === 0}
                >
                  {healthMutation.isPending ? "Saving…" : "Apply to herd"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {data.health.length === 0 ? (
            <p className="text-sm text-muted-foreground">No health records for this herd yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.health.slice(0, 60).map((h) => (
                <li key={h.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                  <p className="font-medium">
                    {h.event_type} · #{tagOf(h.sheep_id)}
                  </p>
                  <p className="text-muted-foreground">
                    {h.recorded_on}
                    {h.product ? ` · ${h.product}` : ""}
                    {h.dose ? ` · ${h.dose}` : ""}
                    {h.withdrawal_until ? ` · withdrawal to ${h.withdrawal_until}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule for the whole herd</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="r-notes">Notes</Label>
                <Textarea
                  id="r-notes"
                  value={reminder.notes}
                  maxLength={500}
                  onChange={(e) => setReminder({ ...reminder, notes: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  onClick={() => reminderMutation.mutate()}
                  disabled={
                    reminderMutation.isPending || !reminder.due_on || data.members.length === 0
                  }
                >
                  {reminderMutation.isPending ? "Saving…" : "Schedule for herd"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {data.reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open reminders for this herd.</p>
          ) : (
            <ul className="space-y-2">
              {data.reminders.map((r) => (
                <li key={r.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                  <p className="font-medium">
                    {r.reminder_type} · #{tagOf(r.sheep_id)}
                  </p>
                  <p className="text-muted-foreground">
                    Due {r.due_on}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
