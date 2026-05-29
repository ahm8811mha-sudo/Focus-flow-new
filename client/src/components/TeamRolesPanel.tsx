import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Briefcase,
  Clock,
  DollarSign,
  AlertCircle,
  Trash2,
  Sparkles,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TeamRole {
  id: string;
  projectId: string;
  roleName: string;
  roleDescription?: string | null;
  roleType?: string | null;
  numberOfPeople?: number | null;
  estimatedDuration?: number | null;
  requiredSkills: string[] | string | null;
  responsibilities: string[] | string | null;
  estimatedCost?: string | null;
  totalCost?: string | null;
  priority?: string | null;
  isAssigned?: boolean | null;
  assignedTo?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TeamRolesPanelProps {
  projectId: string;
  roles: TeamRole[];
  onRefresh: () => void;
}

export function TeamRolesPanel({
  projectId,
  roles,
  onRefresh,
}: TeamRolesPanelProps) {
  const [selectedRole, setSelectedRole] = useState<TeamRole | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const deleteRoleMutation = trpc.aiTeamRoleGenerator.deleteTeamRole.useMutation({
    onSuccess: () => {
      onRefresh();
    },
  });

  const handleDeleteRole = (roleId: string) => {
    if (confirm("هل أنت متأكد من حذف هذا الدور؟")) {
      deleteRoleMutation.mutate({ roleId });
    }
  };

  if (!roles || roles.length === 0) {
    return (
      <div className="text-center py-8">
        <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-500">لم يتم اقتراح أدوار فريق بعد</p>
        <p className="text-sm text-gray-400 mt-1">
          استخدم "توليد بالذكاء الاصطناعي" لاقتراح أدوار الفريق
        </p>
      </div>
    );
  }

  // Calculate team statistics
  const totalPeople = roles.reduce((sum, role) => sum + (role.numberOfPeople || 0), 0);
  const totalCost = roles.reduce((sum, role) => {
    const cost = parseInt(role.totalCost || '0') || 0;
    return sum + cost;
  }, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "عالية":
        return "bg-red-100 text-red-800";
      case "متوسطة":
        return "bg-yellow-100 text-yellow-800";
      case "منخفضة":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleIcon = (roleType: string) => {
    const icons: Record<string, string> = {
      manager: "👨‍💼",
      developer: "👨‍💻",
      designer: "🎨",
      qa: "🧪",
      devops: "⚙️",
      analyst: "📊",
      consultant: "🤝",
      other: "👤",
    };
    return icons[roleType] || "👤";
  };

  return (
    <div className="space-y-4">
      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              إجمالي الفريق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalPeople}</div>
            <p className="text-xs text-gray-500 mt-1">شخص</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              عدد الأدوار
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{roles.length}</div>
            <p className="text-xs text-gray-500 mt-1">دور</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              إجمالي التكلفة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCost.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">ريال</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Roles Cards */}
      <div className="space-y-3">
        {roles.map((role) => (
          <Card key={role.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getRoleIcon(role.roleType || 'other')}</div>
                  <div>
                    <CardTitle className="text-lg">{role.roleName}</CardTitle>
                    <CardDescription>{role.roleDescription}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className={getPriorityColor(role.priority || 'متوسطة')}>
                    {role.priority || 'متوسطة'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRole(role.id)}
                    disabled={deleteRoleMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">عدد الأشخاص</p>
                  <p className="text-xl font-bold">{role.numberOfPeople}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">المدة المتوقعة</p>
                  <p className="text-xl font-bold">{role.estimatedDuration} يوم</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">التكلفة للفرد</p>
                  <p className="text-lg font-bold">{role.estimatedCost}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">التكلفة الإجمالية</p>
                  <p className="text-lg font-bold">{role.totalCost}</p>
                </div>
              </div>

              {/* Skills */}
              <div>
                <p className="text-sm font-semibold mb-2">المهارات المطلوبة:</p>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(role.requiredSkills) &&
                    role.requiredSkills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                </div>
              </div>

              {/* Responsibilities */}
              <div>
                <p className="text-sm font-semibold mb-2">المسؤوليات:</p>
                <ul className="space-y-1">
                  {Array.isArray(role.responsibilities) &&
                    role.responsibilities.slice(0, 3).map((resp, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                  {Array.isArray(role.responsibilities) &&
                    role.responsibilities.length > 3 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={() => {
                          setSelectedRole(role);
                          setShowDetails(true);
                        }}
                      >
                        عرض المزيد...
                      </Button>
                    )}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role Details Dialog */}
      {selectedRole && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{getRoleIcon(selectedRole.roleType || 'other')}</span>
                {selectedRole.roleName}
              </DialogTitle>
              <DialogDescription>{selectedRole.roleDescription}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Full Responsibilities */}
              <div>
                <h3 className="font-semibold mb-2">جميع المسؤوليات:</h3>
                <ul className="space-y-2">
                  {Array.isArray(selectedRole.responsibilities) &&
                    selectedRole.responsibilities.map((resp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 mt-1">✓</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                </ul>
              </div>

              {/* Full Skills */}
              <div>
                <h3 className="font-semibold mb-2">المهارات المطلوبة:</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedRole.requiredSkills) &&
                    selectedRole.requiredSkills.map((skill, idx) => (
                      <Badge key={idx} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">ملخص الدور:</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">عدد الأشخاص</p>
                    <p className="font-semibold">{selectedRole.numberOfPeople || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">المدة المتوقعة</p>
                    <p className="font-semibold">{selectedRole.estimatedDuration || 0} يوم</p>
                  </div>
                  <div>
                    <p className="text-gray-600">التكلفة للفرد</p>
                    <p className="font-semibold">{selectedRole.estimatedCost || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">التكلفة الإجمالية</p>
                    <p className="font-semibold">{selectedRole.totalCost || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
