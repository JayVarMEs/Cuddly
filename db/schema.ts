import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const plushies = sqliteTable("plushies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  note: text("note").notNull().default(""),
  imageKey: text("image_key"),
  cuddleCount: integer("cuddle_count").notNull().default(0),
  lastCuddledAt: integer("last_cuddled_at"),
  queuePosition: integer("queue_position"),
  createdAt: integer("created_at").notNull(),
});

export const cuddleEvents = sqliteTable("cuddle_events", {
  id: text("id").primaryKey(),
  plushieId: text("plushie_id")
    .notNull()
    .references(() => plushies.id, { onDelete: "cascade" }),
  cuddledAt: integer("cuddled_at").notNull(),
});

export const suggestions = sqliteTable("suggestions", {
  id: text("id").primaryKey(),
  plushieId: text("plushie_id")
    .notNull()
    .references(() => plushies.id, { onDelete: "cascade" }),
  suggesterName: text("suggester_name").notNull().default("Someone"),
  message: text("message").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});

export const appState = sqliteTable("app_state", {
  id: integer("id").primaryKey(),
  cycle: integer("cycle").notNull().default(1),
});
