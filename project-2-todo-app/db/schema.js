import {
    integer,
    pgTable,
    varchar,
    text,
    timestamp,
  } from "drizzle-orm/pg-core";
  
  export const todoTable = pgTable("todos", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    todo: text().notNull(),
    created_at: timestamp("created_at", { mode: "date" }).defaultNow(),
    updated_at: timestamp("updated_at", { mode: "date" }).defaultNow(), // No onUpdate()
  });
  