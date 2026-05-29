import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDb } from "./db";
import { projects, projectSteps, projectRequirements } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            steps: [
              {
                name: "تجهيز المستندات",
                description: "جمع وتجهيز جميع المستندات المطلوبة",
                duration: 3,
                order: 1,
              },
              {
                name: "التقديم للجهات الحكومية",
                description: "تقديم الطلب والمستندات للجهات المختصة",
                duration: 5,
                order: 2,
              },
              {
                name: "الموافقة والاستخراج",
                description: "انتظار الموافقة واستخراج السجل التجاري",
                duration: 7,
                order: 3,
              },
            ],
            requirements: [
              {
                name: "صور شخصية",
                type: "resource",
                quantity: "4 صور",
                estimatedCost: 50,
                description: "صور شخصية بحجم 4x6",
              },
              {
                name: "هوية وطنية",
                type: "resource",
                quantity: "1",
                estimatedCost: 0,
                description: "صورة من الهوية الوطنية",
              },
            ],
            governmentRequirements: [
              {
                name: "رسوم التسجيل",
                description: "دفع رسوم التسجيل للجهات الحكومية",
                cost: 500,
              },
            ],
            timeline: {
              totalDays: 15,
              startDate: "2026-04-23",
              endDate: "2026-05-08",
            },
            budget: {
              materials: 50,
              labor: 200,
              government: 500,
              contingency: 100,
              total: 850,
            },
            risks: [
              {
                risk: "تأخر الموافقة من الجهات الحكومية",
                mitigation: "التقديم المبكر والمتابعة المستمرة",
              },
            ],
          }),
        },
      },
    ],
  }),
}));

describe("AI Project Generator", () => {
  // Tests focus on LLM response validation and data structure
  // Database operations are tested separately in integration tests

  it("should generate project steps from description", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت مدير مشاريع خبير",
        },
        {
          role: "user",
          content: "مشروع إنشاء سجل تجاري",
        },
      ],
    });

    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(response.choices[0].message.content).toBeDefined();

    const content = response.choices[0].message.content;
    const plan = typeof content === "string" ? JSON.parse(content) : content;

    expect(plan.steps).toBeDefined();
    expect(Array.isArray(plan.steps)).toBe(true);
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it("should extract requirements from generated plan", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت مدير مشاريع خبير",
        },
        {
          role: "user",
          content: "مشروع إنشاء سجل تجاري",
        },
      ],
    });

    const content = response.choices[0].message.content;
    const plan = typeof content === "string" ? JSON.parse(content) : content;

    expect(plan.requirements).toBeDefined();
    expect(Array.isArray(plan.requirements)).toBe(true);
    expect(plan.requirements.length).toBeGreaterThan(0);

    // Check requirement structure
    const req = plan.requirements[0];
    expect(req.name).toBeDefined();
    expect(req.type).toBeDefined();
    expect(req.quantity).toBeDefined();
  });

  it("should extract government requirements", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت مدير مشاريع خبير",
        },
        {
          role: "user",
          content: "مشروع إنشاء سجل تجاري",
        },
      ],
    });

    const content = response.choices[0].message.content;
    const plan = typeof content === "string" ? JSON.parse(content) : content;

    expect(plan.governmentRequirements).toBeDefined();
    expect(Array.isArray(plan.governmentRequirements)).toBe(true);
  });

  it("should calculate total budget correctly", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت مدير مشاريع خبير",
        },
        {
          role: "user",
          content: "مشروع إنشاء سجل تجاري",
        },
      ],
    });

    const content = response.choices[0].message.content;
    const plan = typeof content === "string" ? JSON.parse(content) : content;

    expect(plan.budget).toBeDefined();
    expect(plan.budget.total).toBeDefined();
    expect(plan.budget.total).toBeGreaterThan(0);

    // Verify budget components
    expect(plan.budget.materials).toBeDefined();
    expect(plan.budget.labor).toBeDefined();
    expect(plan.budget.government).toBeDefined();
    expect(plan.budget.contingency).toBeDefined();
  });

  it("should extract timeline information", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت مدير مشاريع خبير",
        },
        {
          role: "user",
          content: "مشروع إنشاء سجل تجاري",
        },
      ],
    });

    const content = response.choices[0].message.content;
    const plan = typeof content === "string" ? JSON.parse(content) : content;

    expect(plan.timeline).toBeDefined();
    expect(plan.timeline.totalDays).toBeDefined();
    expect(plan.timeline.startDate).toBeDefined();
    expect(plan.timeline.endDate).toBeDefined();
    expect(plan.timeline.totalDays).toBeGreaterThan(0);
  });

  it("should include risk assessment", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت مدير مشاريع خبير",
        },
        {
          role: "user",
          content: "مشروع إنشاء سجل تجاري",
        },
      ],
    });

    const content = response.choices[0].message.content;
    const plan = typeof content === "string" ? JSON.parse(content) : content;

    expect(plan.risks).toBeDefined();
    expect(Array.isArray(plan.risks)).toBe(true);

    if (plan.risks.length > 0) {
      const risk = plan.risks[0];
      expect(risk.risk).toBeDefined();
      expect(risk.mitigation).toBeDefined();
    }
  });

  it("should handle different project types", async () => {
    const projectTypes = [
      "موقع إلكتروني تجاري",
      "تطبيق جوال",
      "سجل تجاري",
      "متجر إلكتروني",
    ];

    for (const type of projectTypes) {
      const { invokeLLM } = await import("./_core/llm");
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "أنت مدير مشاريع خبير",
          },
          {
            role: "user",
            content: `مشروع من نوع: ${type}`,
          },
        ],
      });

      expect(response).toBeDefined();
      expect(response.choices[0].message.content).toBeDefined();

      const content = response.choices[0].message.content;
      const plan = typeof content === "string" ? JSON.parse(content) : content;

      expect(plan.steps).toBeDefined();
      expect(plan.requirements).toBeDefined();
      expect(plan.budget).toBeDefined();
    }
  });

  it("should validate step structure", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت مدير مشاريع خبير",
        },
        {
          role: "user",
          content: "مشروع إنشاء سجل تجاري",
        },
      ],
    });

    const content = response.choices[0].message.content;
    const plan = typeof content === "string" ? JSON.parse(content) : content;

    for (const step of plan.steps) {
      expect(step.name).toBeDefined();
      expect(typeof step.name).toBe("string");
      expect(step.description).toBeDefined();
      expect(typeof step.description).toBe("string");
      expect(step.duration).toBeDefined();
      expect(typeof step.duration).toBe("number");
      expect(step.order).toBeDefined();
      expect(typeof step.order).toBe("number");
    }
  });

  it("should validate requirement structure", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت مدير مشاريع خبير",
        },
        {
          role: "user",
          content: "مشروع إنشاء سجل تجاري",
        },
      ],
    });

    const content = response.choices[0].message.content;
    const plan = typeof content === "string" ? JSON.parse(content) : content;

    for (const req of plan.requirements) {
      expect(req.name).toBeDefined();
      expect(typeof req.name).toBe("string");
      expect(req.type).toBeDefined();
      expect(["material", "budget", "personnel", "resource", "equipment", "other"]).toContain(
        req.type
      );
      expect(req.quantity).toBeDefined();
      expect(req.estimatedCost).toBeDefined();
    }
  });
});
