import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createSheep, listSheep, listHerds } from "@/lib/farm.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/flock/")({
  head: () => ({
    meta: [
      { title: "Flock register — Flockbook" },
      { name: "description", content: "Your sheep register: tags, breeds, sexes, ages and status." },
      { property: "og:title", content: "Flock register — Flockbook" },
      { property: "og:description", content: "Browse and add sheep to your flock register." },
    ],
  }),
  component: FlockPage,
  errorComponent: ({ error }) => <p role="alert">{error.message}</p>,
});

const sexes = ["ewe", "ram", "wether"] as const;
const statuses = ["active", "sold", "deceased", "culled"] as const;

function ageFrom(birth: string | null) {
  if (!birth) return "—";
  const months = Math.floor((Date.now() - new Date(birth).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  if (months < 24) return `${months} mo`;
  return `${Math.floor(months / 12)} yr`;
}

function FlockPage() {
  const fetchSheep = useServerFn(listSheep);
  const addSheep = useServerFn(createSheep);
  const queryClient = useQueryClient();
  const fetchHerds = useServerFn(listHerds);
  const { data: sheep } = useSuspenseQuery({ queryKey: ["sheep"], queryFn: () => fetchSheep() });
  const { data: herds } = useSuspenseQuery({ queryKey: ["herds"], queryFn: () => fetchHerds() });

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tag_number: "",
    name: "",
    breed: "",
    sex: "ewe" as (typeof sexes)[number],
    birth_date: "",
    colour: "",
    status: "active" as (typeof statuses)[number],
    notes: "",
    herd_id: "",
  });

  const create = useMutation({
    mutationFn: () => addSheep({ data: form }),
    onSuccess: () => {
      toast.success("Sheep added");
      setOpen(false);
      setForm({
        tag_number: "",
        name: "",
        breed: "",
        sex: "ewe",
        birth_date: "",
        colour: "",
        status: "active",
        notes: "",
        herd_id: "",
      });
      queryClient.invalidateQueries({ queryKey: ["sheep"] });
      queryClient.invalidateQueries({ queryKey: ["farm-summary"] });
      queryClient.invalidateQueries({ queryKey: ["herds"] });
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("duplicate") ? "That tag number already exists" : e.message),
  });

  const filtered = sheep.filter((s) =>
    `${s.tag_number} ${s.name ?? ""} ${s.breed ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Flock register</h1>
          <p className="text-sm text-muted-foreground">{sheep.length} animal(s) recorded.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" aria-hidden /> Add sheep
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add a sheep</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tag">Tag number *</Label>
                <Input
                  id="tag"
                  value={form.tag_number}
                  maxLength={40}
                  onChange={(e) => setForm({ ...form, tag_number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="breed">Breed</Label>
                <Input
                  id="breed"
                  value={form.breed}
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, breed: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sex</Label>
                <Select
                  value={form.sex}
                  onValueChange={(v) => setForm({ ...form, sex: v as (typeof sexes)[number] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sexes.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="birth">Birth date</Label>
                <Input
                  id="birth"
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as (typeof statuses)[number] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Herd</Label>
                <Select
                  value={form.herd_id || "none"}
                  onValueChange={(v) => setForm({ ...form, herd_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  maxLength={500}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending || !form.tag_number.trim()}
              >
                {create.isPending ? "Saving…" : "Save sheep"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder="Search tag, name or breed"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No sheep match. Add your first animal to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((s) => (
            <Link
              key={s.id}
              to="/flock/$sheepId"
              params={{ sheepId: s.id }}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-pasture"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">#{s.tag_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {[s.name, s.breed].filter(Boolean).join(" · ") || "No name recorded"}
                  </p>
                </div>
                <Badge variant={s.status === "active" ? "secondary" : "outline"}>{s.status}</Badge>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>{s.sex}</span>
                <span>{ageFrom(s.birth_date)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
