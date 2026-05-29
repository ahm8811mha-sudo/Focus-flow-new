import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("tasks router", () => {
  it("should create a task with recurrence", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First, create a list
    const listResult = await caller.lists.create({
      name: "Test List",
      color: "#7C6EFA",
      icon: "📋",
    });

    expect(listResult.id).toBeDefined();

    // Then create a task with recurrence
    const taskResult = await caller.tasks.create({
      name: "Recurring Task",
      description: "Test recurring task",
      priority: "عالية",
      dueDate: "2026-03-20",
      dueTime: "10:00",
      listId: listResult.id,
      recurrence: "daily",
    });

    expect(taskResult.id).toBeDefined();
    expect(taskResult.success).toBe(true);
  });

  it("should update task recurrence", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a list and task
    const listResult = await caller.lists.create({
      name: "Test List",
      color: "#7C6EFA",
      icon: "📋",
    });

    const taskResult = await caller.tasks.create({
      name: "Task to Update",
      listId: listResult.id,
      priority: "متوسطة",
    });

    // Update task with recurrence
    const updateResult = await caller.tasks.update({
      id: taskResult.id,
      recurrence: "weekly",
      recurrenceEndDate: "2026-06-20",
    });

    expect(updateResult.success).toBe(true);
  });

  it("should list tasks", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const tasks = await caller.tasks.list();
    expect(Array.isArray(tasks)).toBe(true);
  });

  it("should handle priority levels correctly", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const listResult = await caller.lists.create({
      name: "Priority Test",
      color: "#7C6EFA",
      icon: "📋",
    });

    const priorities = ["منخفضة", "متوسطة", "عالية"] as const;

    for (const priority of priorities) {
      const taskResult = await caller.tasks.create({
        name: `Task with ${priority} priority`,
        priority,
        listId: listResult.id,
      });

      expect(taskResult.id).toBeDefined();
    }
  });
});

describe("lists router", () => {
  it("should create a list", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.lists.create({
      name: "Work",
      color: "#FF6B6B",
      icon: "💼",
    });

    expect(result.id).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("should list user lists", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const lists = await caller.lists.list();
    expect(Array.isArray(lists)).toBe(true);
  });
});

describe("projects router", () => {
  it("should create a project", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.create({
      name: "Test Project",
      description: "A test project",
      color: "#4ECDC4",
      icon: "🚀",
    });

    expect(result.id).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("should list projects", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const projects = await caller.projects.list();
    expect(Array.isArray(projects)).toBe(true);
  });
});

describe("notes router", () => {
  it("should create a note", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notes.create({
      title: "Test Note",
      content: "This is a test note",
      tags: "test, note",
    });

    expect(result.id).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("should list notes", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const notes = await caller.notes.list();
    expect(Array.isArray(notes)).toBe(true);
  });

  it("should support markdown in notes", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const markdownContent = `# Title
## Subtitle
**Bold text**
*Italic text*
\`code\``;

    const result = await caller.notes.create({
      title: "Markdown Note",
      content: markdownContent,
    });

    expect(result.id).toBeDefined();
  });
});
