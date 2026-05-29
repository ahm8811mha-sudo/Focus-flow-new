import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with additional tables for task management system.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Custom task lists (e.g., Work, Personal, Shopping)
 */
export const lists = mysqlTable("lists", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 10 }).default("📋"),
  color: varchar("color", { length: 7 }).default("#7C6EFA"), // Hex color
  isSystem: boolean("isSystem").default(false), // System lists like "Today", "Inbox"
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type List = typeof lists.$inferSelect;
export type InsertList = typeof lists.$inferInsert;

/**
 * Projects to organize tasks into larger groups
 */
export const projects = mysqlTable("projects", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 10 }).default("🚀"),
  color: varchar("color", { length: 7 }).default("#7C6EFA"),
  status: mysqlEnum("status", ["active", "archived", "completed", "on-hold"]).default("active"),
  startDate: varchar("startDate", { length: 10 }), // YYYY-MM-DD
  endDate: varchar("endDate", { length: 10 }), // YYYY-MM-DD
  priority: mysqlEnum("priority", ["منخفضة", "متوسطة", "عالية"]).default("متوسطة"),
  visibility: mysqlEnum("visibility", ["private", "shared", "public"]).default("private"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Main tasks table
 */
export const tasks = mysqlTable("tasks", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  listId: varchar("listId", { length: 64 }).notNull(),
  projectId: varchar("projectId", { length: 64 }), // Optional project association
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("priority", ["منخفضة", "متوسطة", "عالية"]).default("متوسطة"),
  isDone: boolean("isDone").default(false),
  dueDate: varchar("dueDate", { length: 10 }), // YYYY-MM-DD format
  dueTime: varchar("dueTime", { length: 5 }), // HH:MM format
  loggedMinutes: int("loggedMinutes").default(0), // Time tracking
  recurrence: mysqlEnum("recurrence", ["none", "daily", "weekly", "monthly"]).default("none"),
  recurrenceEndDate: varchar("recurrenceEndDate", { length: 10 }), // YYYY-MM-DD
  kanbanColumn: varchar("kanbanColumn", { length: 20 }).default("todo"), // todo, doing, review, done
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Subtasks for breaking down larger tasks
 */
export const subtasks = mysqlTable("subtasks", {
  id: varchar("id", { length: 64 }).primaryKey(),
  taskId: varchar("taskId", { length: 64 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  isDone: boolean("isDone").default(false),
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subtask = typeof subtasks.$inferSelect;
export type InsertSubtask = typeof subtasks.$inferInsert;

/**
 * Notes system with rich text support
 */
export const notes = mysqlTable("notes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  projectId: varchar("projectId", { length: 64 }), // Optional project association
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"), // Markdown or rich text
  tags: varchar("tags", { length: 500 }), // Comma-separated tags
  isPinned: boolean("isPinned").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

/**
 * Task attachments and links
 */
export const attachments = mysqlTable("attachments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  taskId: varchar("taskId", { length: 64 }).notNull(),
  url: text("url").notNull(),
  fileName: varchar("fileName", { length: 500 }),
  fileType: varchar("fileType", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;

/**
 * Activity log for tracking changes
 */
export const activityLog = mysqlTable("activityLog", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  taskId: varchar("taskId", { length: 64 }),
  action: varchar("action", { length: 100 }).notNull(), // created, updated, completed, etc.
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

/**
 * Statistics and metrics
 */
export const statistics = mysqlTable("statistics", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  tasksCompleted: int("tasksCompleted").default(0),
  tasksPending: int("tasksPending").default(0),
  tasksTotal: int("tasksTotal").default(0),
  timeLogged: int("timeLogged").default(0), // in minutes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Statistics = typeof statistics.$inferSelect;
export type InsertStatistics = typeof statistics.$inferInsert;

/**
 * Project members for collaboration
 */
export const projectMembers = mysqlTable("projectMembers", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "editor", "viewer", "commenter"]).default("viewer"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = typeof projectMembers.$inferInsert;

/**
 * Project files and attachments
 */
export const projectFiles = mysqlTable("projectFiles", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileSize: int("fileSize"), // in bytes
  fileType: varchar("fileType", { length: 50 }),
  folder: varchar("folder", { length: 255 }).default("/"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = typeof projectFiles.$inferInsert;

/**
 * Project activities and comments
 */
export const projectActivities = mysqlTable("projectActivities", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["created", "updated", "completed", "commented", "member_added", "member_removed", "status_changed"]).notNull(),
  description: text("description"),
  relatedTaskId: varchar("relatedTaskId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectActivity = typeof projectActivities.$inferSelect;
export type InsertProjectActivity = typeof projectActivities.$inferInsert;

/**
 * Project comments
 */
export const projectComments = mysqlTable("projectComments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  taskId: varchar("taskId", { length: 64 }),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectComment = typeof projectComments.$inferSelect;
export type InsertProjectComment = typeof projectComments.$inferInsert;

/**
 * Project templates
 */
export const projectTemplates = mysqlTable("projectTemplates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 10 }).default("📋"),
  color: varchar("color", { length: 7 }).default("#7C6EFA"),
  templateData: text("templateData"), // JSON with default tasks, fields, etc.
  isPublic: boolean("isPublic").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectTemplate = typeof projectTemplates.$inferSelect;
export type InsertProjectTemplate = typeof projectTemplates.$inferInsert;

/**
 * Task dependencies for Gantt chart
 */
export const taskDependencies = mysqlTable("taskDependencies", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  taskId: varchar("taskId", { length: 64 }).notNull(),
  dependsOnTaskId: varchar("dependsOnTaskId", { length: 64 }).notNull(),
  dependencyType: mysqlEnum("dependencyType", ["finish-to-start", "start-to-start", "finish-to-finish", "start-to-finish"]).default("finish-to-start"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskDependency = typeof taskDependencies.$inferSelect;
export type InsertTaskDependency = typeof taskDependencies.$inferInsert;


/**
 * Project steps/phases for detailed project management
 */
export const projectSteps = mysqlTable("projectSteps", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  stepName: varchar("stepName", { length: 255 }).notNull(),
  description: text("description"),
  startDate: varchar("startDate", { length: 10 }), // YYYY-MM-DD
  plannedEndDate: varchar("plannedEndDate", { length: 10 }), // YYYY-MM-DD
  actualStartDate: varchar("actualStartDate", { length: 10 }), // YYYY-MM-DD (actual start)
  actualEndDate: varchar("actualEndDate", { length: 10 }), // YYYY-MM-DD
  status: mysqlEnum("status", ["pending", "in-progress", "completed", "on-hold", "cancelled", "delayed"]).default("pending"),
  progress: int("progress").default(0), // 0-100
  isCompleted: boolean("isCompleted").default(false), // Checkbox for completion
  notes: text("notes"), // Notes and comments
  duration: int("duration"), // in days
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectStep = typeof projectSteps.$inferSelect;
export type InsertProjectStep = typeof projectSteps.$inferInsert;

/**
 * Project requirements and resources
 */
export const projectRequirements = mysqlTable("projectRequirements", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  stepId: varchar("stepId", { length: 64 }), // Optional: link to specific step
  requirementName: varchar("requirementName", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["resource", "budget", "material", "personnel", "equipment", "other"]).default("resource"),
  quantity: varchar("quantity", { length: 100 }),
  unit: varchar("unit", { length: 50 }), // e.g., hours, units, days
  estimatedCost: decimal("estimatedCost", { precision: 12, scale: 2 }),
  actualCost: decimal("actualCost", { precision: 12, scale: 2 }),
  status: mysqlEnum("status", ["pending", "allocated", "used", "completed"]).default("pending"),
  priority: mysqlEnum("priority", ["منخفضة", "متوسطة", "عالية"]).default("متوسطة"),
  notes: text("notes"),
  isCompleted: boolean("isCompleted").default(false),
  completedAt: timestamp("completedAt"),
  completedBy: int("completedBy"),
  sharedWith: text("sharedWith"),
  sharePermissions: text("sharePermissions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectRequirement = typeof projectRequirements.$inferSelect;
export type InsertProjectRequirement = typeof projectRequirements.$inferInsert;

/**
 * Project resources tracking
 */
export const projectResources = mysqlTable("projectResources", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  requirementId: varchar("requirementId", { length: 64 }).notNull(),
  resourceName: varchar("resourceName", { length: 255 }).notNull(),
  allocatedQuantity: varchar("allocatedQuantity", { length: 100 }),
  usedQuantity: varchar("usedQuantity", { length: 100 }),
  remainingQuantity: varchar("remainingQuantity", { length: 100 }),
  allocatedBy: int("allocatedBy"),
  allocationDate: varchar("allocationDate", { length: 10 }), // YYYY-MM-DD
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectResource = typeof projectResources.$inferSelect;
export type InsertProjectResource = typeof projectResources.$inferInsert;


/**
 * Project team roles - suggested roles for project execution
 */
export const projectTeamRoles = mysqlTable("projectTeamRoles", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  roleName: varchar("roleName", { length: 255 }).notNull(), // e.g., "مدير المشروع", "مطور Backend"
  roleDescription: text("roleDescription"),
  roleType: mysqlEnum("roleType", [
    "manager",
    "developer",
    "designer",
    "qa",
    "devops",
    "analyst",
    "consultant",
    "other",
  ]).default("other"),
  numberOfPeople: int("numberOfPeople").default(1),
  estimatedDuration: int("estimatedDuration"), // in days
  requiredSkills: text("requiredSkills"), // JSON array of skills
  responsibilities: text("responsibilities"), // JSON array of responsibilities
  estimatedCost: varchar("estimatedCost", { length: 100 }), // per person
  totalCost: varchar("totalCost", { length: 100 }), // numberOfPeople * estimatedCost
  priority: mysqlEnum("priority", ["عالية", "متوسطة", "منخفضة"]).default("متوسطة"),
  isAssigned: boolean("isAssigned").default(false),
  assignedTo: int("assignedTo"), // user id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectTeamRole = typeof projectTeamRoles.$inferSelect;
export type InsertProjectTeamRole = typeof projectTeamRoles.$inferInsert;

/**
 * Team member assignments to project roles
 */
export const projectTeamAssignments = mysqlTable("projectTeamAssignments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  roleId: varchar("roleId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  assignmentDate: varchar("assignmentDate", { length: 10 }), // YYYY-MM-DD
  startDate: varchar("startDate", { length: 10 }), // YYYY-MM-DD
  endDate: varchar("endDate", { length: 10 }), // YYYY-MM-DD
  status: mysqlEnum("status", ["pending", "active", "completed", "on-hold"]).default("pending"),
  hoursAllocated: int("hoursAllocated"), // hours per week
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectTeamAssignment = typeof projectTeamAssignments.$inferSelect;
export type InsertProjectTeamAssignment = typeof projectTeamAssignments.$inferInsert;
