import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sexes = ["ewe", "ram", "wether"] as const;
const statuses = ["active", "sold", "deceased", "culled"] as const;
const healthTypes = ["vaccination", "drench", "treatment", "illness", "shearing", "other"] as const;
const breedingTypes = ["mating", "scan", "lambing"] as const;

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v ? v : null));

const optionalDate = z
  .string()
  .trim()
  .max(20)
  .optional()
  .transform((v) => (v ? v : null));

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.string().uuid().safeParse(v).success, "Invalid selection");

export const sheepInput = z.object({
  tag_number: z.string().trim().min(1, "Tag number is required").max(40),
  name: optionalText,
  breed: optionalText,
  sex: z.enum(sexes),
  birth_date: optionalDate,
  colour: optionalText,
  status: z.enum(statuses),
  notes: optionalText,
  herd_id: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.string().uuid().safeParse(v).success, "Invalid herd"),
  dam_id: optionalUuid,
  sire_id: optionalUuid,
});


export const listSheep = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sheep")
      .select("*")
      .order("tag_number", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createSheep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sheepInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sheep")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateSheep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    sheepInput.extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const { error } = await context.supabase.from("sheep").update(fields).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSheep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sheep").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSheepDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [sheep, weights, health, breeding, reminders, deaths, sales, offspring] =
      await Promise.all([
        context.supabase.from("sheep").select("*").eq("id", data.id).maybeSingle(),
        context.supabase
          .from("weight_records")
          .select("*")
          .eq("sheep_id", data.id)
          .order("recorded_on", { ascending: true }),
        context.supabase
          .from("health_records")
          .select("*")
          .eq("sheep_id", data.id)
          .order("recorded_on", { ascending: false }),
        context.supabase
          .from("breeding_records")
          .select("*")
          .eq("sheep_id", data.id)
          .order("recorded_on", { ascending: false }),
        context.supabase
          .from("reminders")
          .select("*")
          .eq("sheep_id", data.id)
          .order("due_on", { ascending: true }),
        context.supabase
          .from("death_records")
          .select("*")
          .eq("sheep_id", data.id)
          .order("died_on", { ascending: false }),
        context.supabase
          .from("sale_records")
          .select("*")
          .eq("sheep_id", data.id)
          .order("sold_on", { ascending: false }),
        context.supabase
          .from("sheep")
          .select("id, tag_number, name, sex, status, birth_date")
          .or(`dam_id.eq.${data.id},sire_id.eq.${data.id}`)
          .order("birth_date", { ascending: false }),
      ]);
    if (sheep.error) throw new Error(sheep.error.message);

    const parentIds = [sheep.data?.dam_id, sheep.data?.sire_id].filter(Boolean) as string[];
    const parents = parentIds.length
      ? (
          await context.supabase
            .from("sheep")
            .select("id, tag_number, name, sex")
            .in("id", parentIds)
        ).data ?? []
      : [];

    return {
      sheep: sheep.data,
      weights: weights.data ?? [],
      health: health.data ?? [],
      breeding: breeding.data ?? [],
      reminders: reminders.data ?? [],
      deaths: deaths.data ?? [],
      sales: sales.data ?? [],
      offspring: offspring.data ?? [],
      parents,
    };
  });

export const addWeight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sheep_id: z.string().uuid(),
        recorded_on: z.string().trim().min(1).max(20),
        weight_kg: z.number().positive().max(500),
        notes: optionalText,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("weight_records")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sheep_id: z.string().uuid(),
        recorded_on: z.string().trim().min(1).max(20),
        event_type: z.enum(healthTypes),
        product: optionalText,
        dose: optionalText,
        withdrawal_until: optionalDate,
        notes: optionalText,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("health_records")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addBreeding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sheep_id: z.string().uuid(),
        recorded_on: z.string().trim().min(1).max(20),
        event_type: z.enum(breedingTypes),
        ram_tag: optionalText,
        lambs_born: z.number().int().min(0).max(20).nullable().default(null),
        lambs_alive: z.number().int().min(0).max(20).nullable().default(null),
        notes: optionalText,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("breeding_records")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        table: z.enum([
          "weight_records",
          "health_records",
          "breeding_records",
          "death_records",
          "sale_records",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------------- Deaths & sales ----------------------------- */

const deathCauses = ["illness", "predation", "accident", "lambing", "age", "unknown", "other"] as const;
const saleTypes = ["private", "auction", "abattoir", "breeding_stock", "other"] as const;

export const addDeath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sheep_id: z.string().uuid(),
        died_on: z.string().trim().min(1).max(20),
        cause: z.enum(deathCauses),
        details: optionalText,
        notes: optionalText,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("death_records")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    const { error: statusError } = await context.supabase
      .from("sheep")
      .update({ status: "deceased" })
      .eq("id", data.sheep_id);
    if (statusError) throw new Error(statusError.message);
    return { ok: true };
  });

export const addSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sheep_id: z.string().uuid(),
        sold_on: z.string().trim().min(1).max(20),
        buyer: optionalText,
        price: z.number().min(0).max(10000000).nullable().default(null),
        sale_type: z.enum(saleTypes),
        notes: optionalText,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sale_records")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    const { error: statusError } = await context.supabase
      .from("sheep")
      .update({ status: "sold" })
      .eq("id", data.sheep_id);
    if (statusError) throw new Error(statusError.message);
    return { ok: true };
  });

export const setParents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sheep_id: z.string().uuid(),
        dam_id: z.string().uuid().nullable(),
        sire_id: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.dam_id === data.sheep_id || data.sire_id === data.sheep_id) {
      throw new Error("An animal cannot be its own parent");
    }
    const { error } = await context.supabase
      .from("sheep")
      .update({ dam_id: data.dam_id, sire_id: data.sire_id })
      .eq("id", data.sheep_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getFarmSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [sheep, weights, health, breeding, profile, reminders] = await Promise.all([
      context.supabase.from("sheep").select("id, tag_number, name, sex, status, birth_date"),
      context.supabase
        .from("weight_records")
        .select("id, sheep_id, recorded_on, weight_kg")
        .order("recorded_on", { ascending: false })
        .limit(200),
      context.supabase
        .from("health_records")
        .select("id, sheep_id, recorded_on, event_type, product, withdrawal_until")
        .order("recorded_on", { ascending: false })
        .limit(10),
      context.supabase
        .from("breeding_records")
        .select("id, sheep_id, recorded_on, event_type, lambs_born, lambs_alive")
        .order("recorded_on", { ascending: false })
        .limit(10),
      context.supabase.from("profiles").select("display_name, farm_name").maybeSingle(),
      context.supabase
        .from("reminders")
        .select("id, sheep_id, reminder_type, due_on, notes, completed_at")
        .is("completed_at", null)
        .order("due_on", { ascending: true })
        .limit(50),
    ]);
    return {
      sheep: sheep.data ?? [],
      weights: weights.data ?? [],
      health: health.data ?? [],
      breeding: breeding.data ?? [],
      profile: profile.data ?? null,
      reminders: reminders.data ?? [],
    };
  });

const reminderTypes = ["vaccination", "deworming", "checkup", "other"] as const;

export const addReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sheep_id: z.string().uuid(),
        reminder_type: z.enum(reminderTypes),
        due_on: z.string().trim().min(1).max(20),
        notes: optionalText,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reminders")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setReminderDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), done: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reminders")
      .update({ completed_at: data.done ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reminders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getReportData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [sheep, weights, health, breeding, reminders, deaths, sales, herds] = await Promise.all([
      context.supabase.from("sheep").select("*").order("tag_number", { ascending: true }),
      context.supabase
        .from("weight_records")
        .select("*")
        .order("recorded_on", { ascending: true }),
      context.supabase
        .from("health_records")
        .select("*")
        .order("recorded_on", { ascending: false }),
      context.supabase
        .from("breeding_records")
        .select("*")
        .order("recorded_on", { ascending: false }),
      context.supabase.from("reminders").select("*").order("due_on", { ascending: true }),
      context.supabase.from("death_records").select("*").order("died_on", { ascending: false }),
      context.supabase.from("sale_records").select("*").order("sold_on", { ascending: false }),
      context.supabase.from("herds").select("id, name").order("name", { ascending: true }),
    ]);
    if (sheep.error) throw new Error(sheep.error.message);
    return {
      sheep: sheep.data ?? [],
      weights: weights.data ?? [],
      health: health.data ?? [],
      breeding: breeding.data ?? [],
      reminders: reminders.data ?? [],
      deaths: deaths.data ?? [],
      sales: sales.data ?? [],
      herds: herds.data ?? [],
    };
  });

/* ---------------------------------- Herds --------------------------------- */

const herdInput = z.object({
  name: z.string().trim().min(1, "Herd name is required").max(60),
  description: optionalText,
  colour: optionalText,
});

export const listHerds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [herds, sheep] = await Promise.all([
      context.supabase.from("herds").select("*").order("name", { ascending: true }),
      context.supabase.from("sheep").select("id, herd_id, status"),
    ]);
    if (herds.error) throw new Error(herds.error.message);
    const rows = sheep.data ?? [];
    return (herds.data ?? []).map((h) => ({
      ...h,
      member_count: rows.filter((s) => s.herd_id === h.id).length,
      active_count: rows.filter((s) => s.herd_id === h.id && s.status === "active").length,
    }));
  });

export const createHerd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => herdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("herds")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateHerd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => herdInput.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const { error } = await context.supabase.from("herds").update(fields).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteHerd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("herds").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setSheepHerd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ sheep_id: z.string().uuid(), herd_id: z.string().uuid().nullable() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sheep")
      .update({ herd_id: data.herd_id })
      .eq("id", data.sheep_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getHerdDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [herd, members, grazing, grazingReminders] = await Promise.all([
      context.supabase.from("herds").select("*").eq("id", data.id).maybeSingle(),
      context.supabase
        .from("sheep")
        .select("id, tag_number, name, sex, status, birth_date")
        .eq("herd_id", data.id)
        .order("tag_number", { ascending: true }),
      context.supabase
        .from("grazing_records")
        .select("*")
        .eq("herd_id", data.id)
        .order("moved_in_on", { ascending: false }),
      context.supabase
        .from("grazing_reminders")
        .select("*")
        .eq("herd_id", data.id)
        .order("due_on", { ascending: true }),
    ]);
    if (herd.error) throw new Error(herd.error.message);

    const memberIds = (members.data ?? []).map((m) => m.id);
    const [health, reminders, weights] = memberIds.length
      ? await Promise.all([
          context.supabase
            .from("health_records")
            .select("*")
            .in("sheep_id", memberIds)
            .order("recorded_on", { ascending: false })
            .limit(200),
          context.supabase
            .from("reminders")
            .select("*")
            .in("sheep_id", memberIds)
            .is("completed_at", null)
            .order("due_on", { ascending: true }),
          context.supabase
            .from("weight_records")
            .select("id, sheep_id, recorded_on, weight_kg")
            .in("sheep_id", memberIds)
            .order("recorded_on", { ascending: false })
            .limit(400),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

    return {
      herd: herd.data,
      members: members.data ?? [],
      grazing: grazing.data ?? [],
      grazingReminders: grazingReminders.data ?? [],
      health: health.data ?? [],
      reminders: reminders.data ?? [],
      weights: weights.data ?? [],
      unassigned: [],
    };
  });

export const listUnassignedSheep = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sheep")
      .select("id, tag_number, name, herd_id")
      .is("herd_id", null)
      .order("tag_number", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addGrazing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        herd_id: z.string().uuid(),
        paddock: z.string().trim().min(1, "Paddock is required").max(80),
        moved_in_on: z.string().trim().min(1).max(20),
        moved_out_on: optionalDate,
        notes: optionalText,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("grazing_records")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const endGrazing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), moved_out_on: z.string().trim().min(1).max(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("grazing_records")
      .update({ moved_out_on: data.moved_out_on })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGrazing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("grazing_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addGrazingReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        herd_id: z.string().uuid(),
        target_paddock: optionalText,
        due_on: z.string().trim().min(1, "Due date is required").max(20),
        notes: optionalText,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("grazing_reminders")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeGrazingReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("grazing_reminders")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGrazingReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("grazing_reminders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const bulkHealthInput = z.object({
  herd_id: z.string().uuid(),
  recorded_on: z.string().trim().min(1).max(20),
  event_type: z.enum(healthTypes),
  product: optionalText,
  dose: optionalText,
  withdrawal_until: optionalDate,
  notes: optionalText,
});

export const addHerdHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bulkHealthInput.parse(input))
  .handler(async ({ data, context }) => {
    const { herd_id, ...fields } = data;
    const { data: members, error: memberError } = await context.supabase
      .from("sheep")
      .select("id")
      .eq("herd_id", herd_id);
    if (memberError) throw new Error(memberError.message);
    if (!members?.length) throw new Error("This herd has no animals yet");
    const { error } = await context.supabase.from("health_records").insert(
      members.map((m) => ({ ...fields, sheep_id: m.id, user_id: context.userId })),
    );
    if (error) throw new Error(error.message);
    return { count: members.length };
  });

export const addHerdReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        herd_id: z.string().uuid(),
        reminder_type: z.enum(reminderTypes),
        due_on: z.string().trim().min(1).max(20),
        notes: optionalText,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { herd_id, ...fields } = data;
    const { data: members, error: memberError } = await context.supabase
      .from("sheep")
      .select("id")
      .eq("herd_id", herd_id);
    if (memberError) throw new Error(memberError.message);
    if (!members?.length) throw new Error("This herd has no animals yet");
    const { error } = await context.supabase.from("reminders").insert(
      members.map((m) => ({ ...fields, sheep_id: m.id, user_id: context.userId })),
    );
    if (error) throw new Error(error.message);
    return { count: members.length };
  });
