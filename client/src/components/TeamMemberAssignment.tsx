import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  skills: string[];
  assignedRoles: string[];
  availability: 'available' | 'partial' | 'unavailable';
  workload: number; // 0-100
}

interface TeamMemberAssignmentProps {
  teamMembers: TeamMember[];
  requiredRoles: Array<{ id: string; name: string; requiredSkills: string[] }>;
  onAssign?: (memberId: string, roleId: string) => void;
  onUnassign?: (memberId: string, roleId: string) => void;
  onAddMember?: (member: Omit<TeamMember, 'id'>) => void;
}

export const TeamMemberAssignment: React.FC<TeamMemberAssignmentProps> = ({
  teamMembers,
  requiredRoles,
  onAssign,
  onUnassign,
  onAddMember,
}) => {
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberSkills, setNewMemberSkills] = useState('');

  const handleAddMember = () => {
    if (newMemberName && newMemberEmail && newMemberRole) {
      onAddMember?.({
        name: newMemberName,
        email: newMemberEmail,
        role: newMemberRole,
        skills: newMemberSkills.split(',').map(s => s.trim()),
        assignedRoles: [],
        availability: 'available',
        workload: 0,
      });
      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberRole('');
      setNewMemberSkills('');
      setShowAddMemberDialog(false);
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailabilityLabel = (availability: string) => {
    switch (availability) {
      case 'available':
        return '✅ متاح';
      case 'partial':
        return '⚠️ متاح جزئياً';
      case 'unavailable':
        return '❌ غير متاح';
      default:
        return 'غير محدد';
    }
  };

  const checkSkillMatch = (memberSkills: string[], requiredSkills: string[]) => {
    return requiredSkills.every(skill =>
      memberSkills.some(ms => ms.toLowerCase().includes(skill.toLowerCase()))
    );
  };

  return (
    <div className="space-y-6">
      {/* Add Member Button */}
      <div className="flex justify-end">
        <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              إضافة عضو جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة عضو فريق جديد</DialogTitle>
              <DialogDescription>أدخل بيانات العضو الجديد</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="الاسم الكامل"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
              />
              <Input
                type="email"
                placeholder="البريد الإلكتروني"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
              />
              <Input
                placeholder="الوظيفة/الدور"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
              />
              <Textarea
                placeholder="المهارات (مفصولة بفواصل)"
                value={newMemberSkills}
                onChange={(e) => setNewMemberSkills(e.target.value)}
                rows={3}
              />
              <Button onClick={handleAddMember} className="w-full">
                إضافة العضو
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map((member) => (
          <Card key={member.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{member.name}</CardTitle>
                  <CardDescription className="text-xs">{member.email}</CardDescription>
                </div>
                <Badge variant="outline">{member.role}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
              {/* Availability */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">التوفر:</p>
                <Badge className={getAvailabilityColor(member.availability)}>
                  {getAvailabilityLabel(member.availability)}
                </Badge>
              </div>

              {/* Workload */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">الحمل الوظيفي: {member.workload}%</p>
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      member.workload > 80 ? 'bg-red-500' : member.workload > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${member.workload}%` }}
                  />
                </div>
              </div>

              {/* Skills */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">المهارات:</p>
                <div className="flex flex-wrap gap-1">
                  {member.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Assigned Roles */}
              {member.assignedRoles.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">الأدوار المعينة:</p>
                  <div className="space-y-1">
                    {member.assignedRoles.map((roleId) => {
                      const role = requiredRoles.find(r => r.id === roleId);
                      return (
                        <div key={roleId} className="flex items-center justify-between bg-blue-50 p-2 rounded text-xs">
                          <span>{role?.name}</span>
                          <button
                            onClick={() => onUnassign?.(member.id, roleId)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Skill Gaps */}
              {member.assignedRoles.length > 0 && (
                <div>
                  {member.assignedRoles.some((roleId) => {
                    const role = requiredRoles.find(r => r.id === roleId);
                    return role && !checkSkillMatch(member.skills, role.requiredSkills);
                  }) && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        هناك فجوات في المهارات المطلوبة
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Assign Role Button */}
              {member.assignedRoles.length < requiredRoles.length && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="w-full">
                      <Plus className="w-3 h-3 mr-1" />
                      تعيين دور
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>تعيين دور لـ {member.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      {requiredRoles
                        .filter(role => !member.assignedRoles.includes(role.id))
                        .map((role) => {
                          const hasSkills = checkSkillMatch(member.skills, role.requiredSkills);
                          return (
                            <div
                              key={role.id}
                              className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer flex items-start justify-between"
                              onClick={() => {
                                onAssign?.(member.id, role.id);
                              }}
                            >
                              <div>
                                <p className="font-medium">{role.name}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {role.requiredSkills.map((skill, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className={`text-xs ${
                                        member.skills.some(ms =>
                                          ms.toLowerCase().includes(skill.toLowerCase())
                                        )
                                          ? 'bg-green-100'
                                          : 'bg-red-100'
                                      }`}
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              {hasSkills && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
                            </div>
                          );
                        })}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {teamMembers.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">لا توجد أعضاء فريق حالياً</p>
            <Button onClick={() => setShowAddMemberDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              إضافة أول عضو
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamMemberAssignment;
