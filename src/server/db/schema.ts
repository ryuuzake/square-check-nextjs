import { relations, sql } from "drizzle-orm";
import {
  boolean,
  char,
  integer,
  pgEnum,
  pgTableCreator,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `square-check_${name}`);

export const roleEnum = pgEnum("role", ["lecturer", "student"]);

export const users = createTable("user", {
  id: text("id").primaryKey(),
  publicId: char("public_id", { length: 12 }).$defaultFn(() => nanoid(12)),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  isAdmin: boolean("is_admin").default(false),
  image: varchar("image", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const departments = createTable("department", {
  id: serial("id").primaryKey(),
  publicId: char("public_id", { length: 12 }).$defaultFn(() => nanoid(12)),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const classrooms = createTable("classroom", {
  id: serial("id").primaryKey(),
  publicId: char("public_id", { length: 12 }).$defaultFn(() => nanoid(12)),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }),
  departmentId: integer("department_id").references(() => departments.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const classroomsRelations = relations(classrooms, ({ one, many }) => ({
  department: one(departments, {
    fields: [classrooms.departmentId],
    references: [departments.id],
  }),
  subjects: many(subjects),
}));

export const userInfos = createTable("user_info", {
  id: serial("id").primaryKey(),
  publicId: char("public_id", { length: 12 }).$defaultFn(() => nanoid(12)),
  name: varchar("name", { length: 255 }).notNull(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  role: roleEnum("role").default("student"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userInfosRelations = relations(userInfos, ({ one }) => ({
  user: one(users, {
    fields: [userInfos.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [userInfos.departmentId],
    references: [departments.id],
  }),
}));

export const subjects = createTable("subject", {
  id: serial("id").primaryKey(),
  publicId: char("public_id", { length: 12 }).$defaultFn(() => nanoid(12)),
  name: varchar("name", { length: 255 }).notNull(),
  lecturerId: serial("user_info_id").references(() => userInfos.id),
  classroomId: serial("classroom_id").references(() => classrooms.id),
  slug: varchar("slug", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  classroom: one(classrooms, {
    fields: [subjects.classroomId],
    references: [classrooms.id],
  }),
  lecturer: one(userInfos, {
    fields: [subjects.lecturerId],
    references: [userInfos.id],
  }),
  schedules: many(schedules),
}));

export const schedules = createTable("schedule", {
  id: serial("id").primaryKey(),
  publicId: char("public_id", { length: 12 }).$defaultFn(() => nanoid(12)),
  subjectId: integer("subject_id").references(() => subjects.id),
  time: timestamp("time", { withTimezone: true }).notNull(),
  startTime: timestamp("start_time", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const schedulesRelations = relations(schedules, ({ one }) => ({
  subject: one(subjects, {
    fields: [schedules.subjectId],
    references: [subjects.id],
  }),
}));

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "late",
  "leave",
  "absent",
]);

export const studentAttendances = createTable("student_attendance", {
  scheduleId: integer("schedule_id").references(() => schedules.id),
  studentId: integer("student_id").references(() => userInfos.id),
  time: timestamp("time", { withTimezone: true }).notNull(),
  status: attendanceStatusEnum("status").default("absent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = createTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
});
