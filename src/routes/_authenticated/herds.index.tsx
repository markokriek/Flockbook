import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createHerd, listHerds } from "@/lib/farm.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/herds/")({
  head: () => ({
    meta: [
      { title: "Herds — Flockbook" },
      {
        name: "description",
        content: "Group your sheep into herds and manage vaccinations and grazing together.",
      },
      { property: "og:title", content: "Herds — Flockbook" },
      { property: "og:description", content: "Group animals into herds for shared treatments and grazing." },
    ],
  }),
  component: HerdsPage,
  errorComponent: ({ error }) => <p role="alert">{error.message}</p>,
});

function HerdsPage() {
  const fetchHerds = useServerFn(listHerds);
  const addHerd = useServerFn(createHerd);
  const queryClient = useQueryClient();
  const { data: herds } = useSuspenseQuery({ queryKey: ["herds"], queryFn: () => fetchHerds() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", colour: "" });

  const create = useMutation({
    mutationFn: () => addHerd({ data: form }),
    onSuccess: () => {
      toast.success("Herd created");
      setOpen(false);
      setForm({ name: "", description: "", colour: "" });
      queryClient.invalidateQueries({ queryKey: ["herds"] });
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("duplicate") ? "You already have a herd with that name" : e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Herds</h1>
          <p className="text-sm text-muted-foreground">
            {herds.length} herd(s). Group animals to treat and move them together.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" aria-hidden /> New herd
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a herd</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="herd-name">Name *</Label>
                <Input
                  id="herd-name"
                  value={form.name}
                  maxLength={60}
                  placeholder="e.g. Breeding ewes"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="herd-colour">Colour tag</Label>
                <Input
                  id="herd-colour"
                  value={form.colour}
                  maxLength={40}
                  placeholder="e.g. blue"
                  onChange={(e) => setForm({ ...form, colour: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="herd-desc">Description</Label>
                <Textarea
                  id="herd-desc"
                  value={form.description}
                  maxLength={500}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={create.isPending || !form.name.trim()}>
                {create.isPending ? "Saving…" : "Create herd"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {herds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No herds yet. Create one to group animals for vaccinations and grazing moves.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {herds.map((h) => (
            <Link
              key={h.id}
              to="/herds/$herdId"
              params={{ herdId: h.id }}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-pasture"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">{h.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {h.description || "No description"}
                  </p>
                </div>
                {h.colour ? <Badge variant="outline">{h.colour}</Badge> : null}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="size-3.5" aria-hidden />
                {h.member_count} animal(s) · {h.active_count} active
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
