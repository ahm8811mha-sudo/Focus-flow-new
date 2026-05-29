import { eq, and, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, tasks, lists, projects, notes, subtasks, activityLog, statistics } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Task queries
export async function getUserTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
}

export async function getTasksByList(userId: number, listId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.listId, listId)))
    .orderBy(asc(tasks.order));
}

export async function getTasksByDate(userId: number, date: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.dueDate, date)))
    .orderBy(asc(tasks.order));
}

export async function getTasksByProject(userId: number, projectId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.projectId, projectId)))
    .orderBy(asc(tasks.order));
}

export async function getTasksByKanbanColumn(userId: number, column: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.kanbanColumn, column)))
    .orderBy(asc(tasks.order));
}

export async function getPendingTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.isDone, false)))
    .orderBy(desc(tasks.priority), asc(tasks.dueDate));
}

export async function getCompletedTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.isDone, true)))
    .orderBy(desc(tasks.updatedAt));
}

// List queries
export async function getUserLists(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lists).where(eq(lists.userId, userId)).orderBy(asc(lists.order));
}

// Project queries
export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
}

// Notes queries
export async function getUserNotes(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.updatedAt));
}

export async function getNotesByProject(userId: number, projectId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.projectId, projectId)))
    .orderBy(desc(notes.updatedAt));
}

// Subtasks queries
export async function getTaskSubtasks(taskId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subtasks).where(eq(subtasks.taskId, taskId)).orderBy(asc(subtasks.order));
}

// Statistics queries
export async function getStatistics(userId: number, date: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(statistics)
    .where(and(eq(statistics.userId, userId), eq(statistics.date, date)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getStatisticsRange(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(statistics)
    .where(and(
      eq(statistics.userId, userId),
      // Note: This is a simplified range query. In production, use proper date comparison
    ))
    .orderBy(asc(statistics.date));
}
