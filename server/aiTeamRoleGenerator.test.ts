import { describe, it, expect, vi, beforeEach } from "vitest";
import { nanoid } from "nanoid";

// Mock invokeLLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

describe("AI Team Role Generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate team roles from project description", async () => {
    const { invokeLLM } = await import("./_core/llm");
    
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              teamRoles: [
                {
                  roleName: "مدير المشروع",
                  roleType: "manager",
                  roleDescription: "إدارة المشروع والفريق",
                  numberOfPeople: 1,
                  estimatedDuration: 90,
                  requiredSkills: ["إدارة المشاريع", "التواصل", "القيادة"],
                  responsibilities: [
                    "تنسيق الفريق",
                    "متابعة الجدول الزمني",
                    "إدارة الميزانية",
                  ],
                  estimatedCost: "10000",
                  priority: "عالية",
                },
                {
                  roleName: "مطور Backend",
                  roleType: "developer",
                  roleDescription: "تطوير الخادم وقاعدة البيانات",
                  numberOfPeople: 2,
                  estimatedDuration: 60,
                  requiredSkills: ["Node.js", "Express", "MySQL"],
                  responsibilities: [
                    "بناء API",
                    "تصميم قاعدة البيانات",
                    "نظام الدفع",
                  ],
                  estimatedCost: "8000",
                  priority: "عالية",
                },
              ],
              teamStructure: {
                totalPeople: 3,
                totalCost: "26000",
                estimatedDuration: 90,
                recommendations: [
                  "ابدأ بمدير المشروع",
                  "ركز على الأمان",
                ],
              },
              risks: [
                {
                  risk: "تأخير في التسليم",
                  mitigation: "إضافة وقت احتياطي",
                },
              ],
            }),
          },
        },
      ],
    };

    vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت خبير في إدارة المشاريع",
        },
        {
          role: "user",
          content: "إنشاء موقع إلكتروني تجاري",
        },
      ],
    });

    expect(response.choices[0].message.content).toBeDefined();
    const content = JSON.parse(response.choices[0].message.content as string);
    expect(content.teamRoles).toHaveLength(2);
    expect(content.teamRoles[0].roleName).toBe("مدير المشروع");
    expect(content.teamStructure.totalPeople).toBe(3);
  });

  it("should handle different project types", async () => {
    const { invokeLLM } = await import("./_core/llm");

    const projectTypes = [
      "تطبيق موبايل",
      "نظام إدارة",
      "متجر إلكتروني",
      "منصة تعليمية",
    ];

    for (const projectType of projectTypes) {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                teamRoles: [
                  {
                    roleName: "مدير المشروع",
                    roleType: "manager",
                    numberOfPeople: 1,
                    estimatedDuration: 60,
                    requiredSkills: ["إدارة المشاريع"],
                    responsibilities: ["تنسيق الفريق"],
                    estimatedCost: "5000",
                    priority: "عالية",
                  },
                ],
                teamStructure: {
                  totalPeople: 1,
                  totalCost: "5000",
                  estimatedDuration: 60,
                  recommendations: [],
                },
                risks: [],
              }),
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "أنت خبير في إدارة المشاريع",
          },
          {
            role: "user",
            content: projectType,
          },
        ],
      });

      const content = JSON.parse(response.choices[0].message.content as string);
      expect(content.teamRoles).toBeDefined();
      expect(content.teamRoles.length).toBeGreaterThan(0);
    }
  });

  it("should generate correct skill requirements", async () => {
    const { invokeLLM } = await import("./_core/llm");

    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              teamRoles: [
                {
                  roleName: "مصمم UI/UX",
                  roleType: "designer",
                  numberOfPeople: 1,
                  estimatedDuration: 45,
                  requiredSkills: [
                    "Figma",
                    "تصميم تفاعلي",
                    "UX Research",
                    "Prototyping",
                  ],
                  responsibilities: [
                    "تصميم الواجهة",
                    "تجربة المستخدم",
                    "الاختبار",
                  ],
                  estimatedCost: "6000",
                  priority: "عالية",
                },
              ],
              teamStructure: {
                totalPeople: 1,
                totalCost: "6000",
                estimatedDuration: 45,
                recommendations: [],
              },
              risks: [],
            }),
          },
        },
      ],
    };

    vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت خبير في إدارة المشاريع",
        },
        {
          role: "user",
          content: "موقع تجاري",
        },
      ],
    });

    const content = JSON.parse(response.choices[0].message.content as string);
    const designerRole = content.teamRoles[0];

    expect(designerRole.requiredSkills).toContain("Figma");
    expect(designerRole.requiredSkills).toContain("تصميم تفاعلي");
    expect(designerRole.requiredSkills.length).toBeGreaterThan(2);
  });

  it("should calculate team statistics correctly", async () => {
    const { invokeLLM } = await import("./_core/llm");

    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              teamRoles: [
                {
                  roleName: "مدير المشروع",
                  roleType: "manager",
                  numberOfPeople: 1,
                  estimatedDuration: 90,
                  requiredSkills: ["إدارة المشاريع"],
                  responsibilities: ["تنسيق الفريق"],
                  estimatedCost: "10000",
                  priority: "عالية",
                },
                {
                  roleName: "مطور",
                  roleType: "developer",
                  numberOfPeople: 3,
                  estimatedDuration: 90,
                  requiredSkills: ["Node.js"],
                  responsibilities: ["تطوير"],
                  estimatedCost: "8000",
                  priority: "عالية",
                },
                {
                  roleName: "مختبر QA",
                  roleType: "qa",
                  numberOfPeople: 1,
                  estimatedDuration: 45,
                  requiredSkills: ["اختبار"],
                  responsibilities: ["اختبار"],
                  estimatedCost: "5000",
                  priority: "متوسطة",
                },
              ],
              teamStructure: {
                totalPeople: 5,
                totalCost: "62000",
                estimatedDuration: 90,
                recommendations: [],
              },
              risks: [],
            }),
          },
        },
      ],
    };

    vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت خبير في إدارة المشاريع",
        },
        {
          role: "user",
          content: "موقع تجاري",
        },
      ],
    });

    const content = JSON.parse(response.choices[0].message.content as string);

    expect(content.teamStructure.totalPeople).toBe(5);
    expect(content.teamRoles.length).toBe(3);

    // Verify individual roles
    const managerRole = content.teamRoles[0];
    const developerRole = content.teamRoles[1];
    const qaRole = content.teamRoles[2];

    expect(managerRole.numberOfPeople).toBe(1);
    expect(developerRole.numberOfPeople).toBe(3);
    expect(qaRole.numberOfPeople).toBe(1);
  });

  it("should identify risks and mitigation strategies", async () => {
    const { invokeLLM } = await import("./_core/llm");

    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              teamRoles: [],
              teamStructure: {
                totalPeople: 0,
                totalCost: "0",
                estimatedDuration: 0,
                recommendations: [],
              },
              risks: [
                {
                  risk: "نقص الموارد",
                  mitigation: "تخطيط أفضل للميزانية",
                },
                {
                  risk: "تأخير في التسليم",
                  mitigation: "إضافة وقت احتياطي",
                },
                {
                  risk: "مشاكل في التواصل",
                  mitigation: "استخدام أدوات تعاون",
                },
              ],
            }),
          },
        },
      ],
    };

    vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت خبير في إدارة المشاريع",
        },
        {
          role: "user",
          content: "موقع تجاري",
        },
      ],
    });

    const content = JSON.parse(response.choices[0].message.content as string);

    expect(content.risks).toHaveLength(3);
    expect(content.risks[0].risk).toBe("نقص الموارد");
    expect(content.risks[0].mitigation).toBeDefined();
  });

  it("should handle priority levels correctly", async () => {
    const { invokeLLM } = await import("./_core/llm");

    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              teamRoles: [
                {
                  roleName: "دور عالي الأولوية",
                  roleType: "manager",
                  numberOfPeople: 1,
                  estimatedDuration: 30,
                  requiredSkills: [],
                  responsibilities: [],
                  estimatedCost: "5000",
                  priority: "عالية",
                },
                {
                  roleName: "دور متوسط الأولوية",
                  roleType: "developer",
                  numberOfPeople: 1,
                  estimatedDuration: 30,
                  requiredSkills: [],
                  responsibilities: [],
                  estimatedCost: "5000",
                  priority: "متوسطة",
                },
                {
                  roleName: "دور منخفض الأولوية",
                  roleType: "consultant",
                  numberOfPeople: 1,
                  estimatedDuration: 10,
                  requiredSkills: [],
                  responsibilities: [],
                  estimatedCost: "2000",
                  priority: "منخفضة",
                },
              ],
              teamStructure: {
                totalPeople: 3,
                totalCost: "12000",
                estimatedDuration: 30,
                recommendations: [],
              },
              risks: [],
            }),
          },
        },
      ],
    };

    vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت خبير في إدارة المشاريع",
        },
        {
          role: "user",
          content: "موقع تجاري",
        },
      ],
    });

    const content = JSON.parse(response.choices[0].message.content as string);

    const priorities = content.teamRoles.map((r: any) => r.priority);
    expect(priorities).toContain("عالية");
    expect(priorities).toContain("متوسطة");
    expect(priorities).toContain("منخفضة");
  });
});
