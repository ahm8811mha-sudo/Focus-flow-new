import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ProjectEditDialog } from '@/components/ProjectEditDialog';
import { AIProjectGenerationDialog } from '@/components/AIProjectGenerationDialog';
import { TeamRolesPanel } from '@/components/TeamRolesPanel';
import { GanttChart } from '@/components/GanttChart';
import { BudgetTrackingDashboard } from '@/components/BudgetTrackingDashboard';
import { RequirementCard } from '@/components/RequirementCard';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Trash2, 
  MessageSquare,
  FileText,
  Activity,
  BarChart3,
  Calendar,
  Grid3x3,
  List,
  Sparkles
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('متوسطة');
  const [showNewStepDialog, setShowNewStepDialog] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');
  const [newStepDuration, setNewStepDuration] = useState('');
  const [newStepStartDate, setNewStepStartDate] = useState('');
  const [showNewRequirementDialog, setShowNewRequirementDialog] = useState(false);
  const [newRequirementName, setNewRequirementName] = useState('');
  const [newRequirementType, setNewRequirementType] = useState('resource');
  const [newRequirementQuantity, setNewRequirementQuantity] = useState('');
  const [newRequirementCost, setNewRequirementCost] = useState('');
  const [showAIGenerationDialog, setShowAIGenerationDialog] = useState(false);

  // Queries
  const projectQuery = trpc.projects.list.useQuery();
  const tasksQuery = trpc.tasks.list.useQuery();
  const stepsQuery = trpc.projects.getSteps.useQuery({ projectId: projectId || '' });
  const requirementsQuery = trpc.projects.getRequirements.useQuery({ projectId: projectId || '' });
  const teamRolesQuery = trpc.aiTeamRoleGenerator.getTeamRoles.useQuery({ projectId: projectId || '' });
  
  // Mutations
  const updateProjectMutation = trpc.projects.update.useMutation({
    onSuccess: () => projectQuery.refetch(),
  });

  const createTaskMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
      setShowNewTaskDialog(false);
      setNewTaskName('');
      setNewTaskDescription('');
      setNewTaskPriority('متوسطة');
    },
  });

  const generateTeamRolesMutation = trpc.aiTeamRoleGenerator.generateTeamRoles.useMutation({
    onSuccess: () => {
      teamRolesQuery.refetch();
      alert('✅ تم اقتراح أدوار الفريق بنجاح!');
    },
    onError: (error) => {
      alert(`❌ خطأ: ${error.message}`);
    },
  });

  const markRequirementCompleteMutation = trpc.requirementProgress.markRequirementComplete.useMutation({
    onSuccess: () => {
      requirementsQuery.refetch();
    },
  });

  const markRequirementIncompleteMutation = trpc.requirementProgress.markRequirementIncomplete.useMutation({
    onSuccess: () => {
      requirementsQuery.refetch();
    },
  });

  const shareRequirementMutation = trpc.requirementProgress.shareRequirement.useMutation({
    onSuccess: () => {
      requirementsQuery.refetch();
    },
  });

  const addMemberMutation = trpc.projects.addMember.useMutation({
    onSuccess: () => {
      setNewMemberEmail('');
      projectQuery.refetch();
      alert('✅ تم إضافة العضو بنجاح');
    },
    onError: (error) => {
      alert(`❌ فشل إضافة العضو: ${error.message}`);
    },
  });

  const addCommentMutation = trpc.projects.addComment.useMutation({
    onSuccess: () => {
      setNewComment('');
      projectQuery.refetch();
      alert('✅ تم إضافة التعليق بنجاح');
    },
    onError: (error) => {
      alert(`❌ فشل إضافة التعليق: ${error.message}`);
    },
  });

  const project = projectQuery.data?.find(p => p.id === projectId);
  const projectTasks = tasksQuery.data?.filter(t => t.projectId === projectId) || [];
  
  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>جاري تحميل تفاصيل المشروع...</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calculate statistics
  const completedTasks = projectTasks.filter(t => t.isDone).length;
  const totalTasks = projectTasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const highPriorityTasks = projectTasks.filter(t => t.priority === 'عالية').length;
  const overdueTasks = projectTasks.filter(t => !t.isDone && t.dueDate != null && new Date(t.dueDate as any) < new Date()).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="text-5xl">{project.icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                {project.status === 'active' ? 'نشط' : project.status === 'on-hold' ? 'معلق' : 'مكتمل'}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">{project.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAIGenerationDialog(true)}
            className="gap-2"
            variant="default"
          >
            <Sparkles className="w-4 h-4" />
            توليد بالذكاء الاصطناعي
          </Button>
          <ProjectEditDialog
            project={project}
            onSave={async (data) => {
              await updateProjectMutation.mutateAsync({
                id: project.id,
                ...data,
              });
            }}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">إجمالي المهام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTasks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">المهام المكتملة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{completedTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">المهام المتبقية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{totalTasks - completedTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">مهام عالية الأولوية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{highPriorityTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">المهام المتأخرة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{overdueTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">تقدم المشروع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>نسبة الإنجاز</span>
              <span className="font-semibold">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {completedTasks} من {totalTasks} مهام مكتملة
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8 overflow-x-auto">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">المهام</span>
          </TabsTrigger>
          <TabsTrigger value="steps" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">الخطوات</span>
          </TabsTrigger>
          <TabsTrigger value="requirements" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">الاحتياجات</span>
          </TabsTrigger>
          <TabsTrigger value="teamRoles" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">الفريق</span>
          </TabsTrigger>
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <Grid3x3 className="w-4 h-4" />
            <span className="hidden sm:inline">كانبان</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">جدول زمني</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">الأعضاء</span>
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">التعليقات</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">الميزانية</span>
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>مهام المشروع</CardTitle>
                  <CardDescription>قائمة جميع مهام هذا المشروع</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowNewTaskDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  مهمة جديدة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projectTasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">لا توجد مهام في هذا المشروع</p>
                ) : (
                  projectTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3 flex-1">
                        <input type="checkbox" checked={task.isDone || false} className="w-4 h-4" />
                        <div className="flex-1">
                          <p className={task.isDone ? 'line-through text-gray-500' : 'font-medium'}>{task.name}</p>
                          <p className="text-xs text-gray-500">{task.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{task.priority}</Badge>
                        {task.dueDate != null ? (
                          <span className="text-xs text-gray-500">{new Date(task.dueDate as any).toLocaleDateString('ar-SA')}</span>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline/Gantt Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <GanttChart
            steps={(stepsQuery.data || []).map((step) => ({
              id: step.id,
              stepName: (step as any).name,
              description: (step as any).description || undefined,
              estimatedDuration: (step as any).duration || 1,
              startDate: (step as any).startDate || new Date().toISOString().split('T')[0],
              stepOrder: 0,
            })) || []}
          />
        </TabsContent>

        {/* Kanban Tab */}
        <TabsContent value="kanban" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>لوحة كانبان</CardTitle>
              <CardDescription>عرض المهام حسب الحالة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm">مهام معلقة</h3>
                  <div className="space-y-2">
                    {projectTasks
                      .filter(t => !t.isDone)
                      .map(task => (
                        <div key={task.id} className="bg-white p-3 rounded border shadow-sm">
                          <p className="text-sm font-medium">{task.name}</p>
                          <Badge className="mt-2" variant="outline">{task.priority || 'متوسطة'}</Badge>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm">مهام مكتملة</h3>
                  <div className="space-y-2">
                    {projectTasks
                      .filter(t => t.isDone)
                      .map(task => (
                        <div key={task.id} className="bg-white p-3 rounded border shadow-sm opacity-60">
                          <p className="text-sm font-medium line-through">{task.name}</p>
                          <Badge className="mt-2" variant="outline">مكتملة</Badge>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>جدول زمني (Gantt)</CardTitle>
              <CardDescription>عرض المهام على محور زمني</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>جدول زمني متقدم - قيد التطوير</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>أعضاء المشروع</CardTitle>
                  <CardDescription>إدارة أعضاء المشروع والصلاحيات</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      إضافة عضو
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إضافة عضو جديد</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        type="email"
                        placeholder="البريد الإلكتروني"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                      />
                      <select className="w-full px-3 py-2 border rounded-md">
                        <option>محرر</option>
                        <option>عارض</option>
                        <option>مراجع</option>
                      </select>
                      <Button 
                        className="w-full"
                        onClick={() => {
                          if (!newMemberEmail) {
                            alert('الرجاء إدخال البريد الإلكتروني');
                            return;
                          }
                          addMemberMutation.mutate({
                            projectId: projectId || '',
                            email: newMemberEmail,
                            role: 'editor',
                          });
                        }}
                        disabled={addMemberMutation.isPending}
                      >
                        {addMemberMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>لا يوجد أعضاء آخرين حالياً</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>التعليقات</CardTitle>
              <CardDescription>تعليقات وملاحظات على المشروع</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="أضف تعليقاً..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button 
                  className="w-full"
                  onClick={() => {
                    if (!newComment.trim()) {
                      alert('الرجاء إدخال تعليق');
                      return;
                    }
                    addCommentMutation.mutate({
                      projectId: projectId || '',
                      content: newComment,
                    });
                  }}
                  disabled={addCommentMutation.isPending}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {addCommentMutation.isPending ? 'جاري الإضافة...' : 'إضافة تعليق'}
                </Button>
              </div>
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد تعليقات حالياً</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget" className="space-y-4">
          <BudgetTrackingDashboard
            budgetData={requirementsQuery.data?.map(req => ({
              category: req.requirementName,
              estimated: parseFloat(String(req.estimatedCost || 0)),
              actual: parseFloat(String(req.actualCost || 0)),
              status: (req.actualCost || 0) > (req.estimatedCost || 0) ? 'over-budget' : (req.actualCost || 0) < (req.estimatedCost || 0) ? 'under-budget' : 'on-budget',
            })) || []}
            totalEstimated={requirementsQuery.data?.reduce((sum, req) => sum + parseFloat(String(req.estimatedCost || 0)), 0) || 0}
            totalActual={requirementsQuery.data?.reduce((sum, req) => sum + parseFloat(String(req.actualCost || 0)), 0) || 0}
            currency="ر.س"
          />
        </TabsContent>

        {/* Steps Tab */}
        <TabsContent value="steps" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>خطوات المشروع</CardTitle>
                  <CardDescription>قائمة خطوات المشروع مع التواريخ والمدة</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowNewStepDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  خطوة جديدة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stepsQuery.isLoading ? (
                <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
              ) : stepsQuery.data && stepsQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {stepsQuery.data.map((step, index) => (
                    <div key={step.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700">
                        {index + 1}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-semibold text-gray-900">{step.stepName}</h4>
                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>⏱️ المدة: {step.duration} يوم</span>
                          {step.startDate && <span>📅 البدء: {new Date(step.startDate).toLocaleDateString('ar-SA')}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد خطوات للمشروع حالياً</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requirements Tab */}
        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>احتياجات المشروع</CardTitle>
                  <CardDescription>الموارد والمواد والميزانية المطلوبة</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowNewRequirementDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  احتياج جديد
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {requirementsQuery.isLoading ? (
                <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
              ) : requirementsQuery.data && requirementsQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {requirementsQuery.data.map((req) => (
                    <RequirementCard
                      key={req.id}
                      requirement={req as any}
                      onComplete={async (completed) => {
                        if (completed) {
                          await markRequirementCompleteMutation.mutateAsync({
                            requirementId: req.id,
                            projectId: projectId || '',
                          });
                        } else {
                          await markRequirementIncompleteMutation.mutateAsync({
                            requirementId: req.id,
                            projectId: projectId || '',
                          });
                        }
                      }}
                      onShare={async (userIds, permission) => {
                        await shareRequirementMutation.mutateAsync({
                          requirementId: req.id,
                          projectId: projectId || '',
                          userIds,
                          permissions: permission,
                        });
                      }}
                      isLoading={markRequirementCompleteMutation.isPending || shareRequirementMutation.isPending}
                      sharedCount={(req as any).sharedWith?.length || 0}
                    />
                  ))}
                  {requirementsQuery.data.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900">
                        إجمالي التكاليف المقدرة: {requirementsQuery.data.reduce((sum, r) => sum + (typeof r.estimatedCost === 'number' ? r.estimatedCost : 0), 0)} ريال
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد احتياجات للمشروع حالياً</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Roles Tab */}
        <TabsContent value="teamRoles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>أدوار الفريق</CardTitle>
                  <CardDescription>الأدوار والمسؤوليات المقترحة لتنفيذ المشروع</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => generateTeamRolesMutation.mutate({ projectId: projectId || '' })}
                  disabled={generateTeamRolesMutation.isPending}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {generateTeamRolesMutation.isPending ? 'جاري التوليد...' : 'اقتراح أدوار'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TeamRolesPanel 
                projectId={projectId || ''}
                roles={teamRolesQuery.data || []}
                onRefresh={() => teamRolesQuery.refetch()}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Task Dialog */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مهمة جديدة</DialogTitle>
            <DialogDescription>أضف مهمة جديدة إلى المشروع</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">اسم المهمة</label>
              <Input
                placeholder="أدخل اسم المهمة"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">الوصف</label>
              <Textarea
                placeholder="أدخل وصف المهمة"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">الأولوية</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="منخفضة">منخفضة</option>
                <option value="متوسطة">متوسطة</option>
                <option value="عالية">عالية</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewTaskDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={() => {
                if (newTaskName.trim() && projectId) {
                  createTaskMutation.mutate({
                    name: newTaskName,
                    description: newTaskDescription,
                    priority: newTaskPriority as 'متوسطة' | 'منخفضة' | 'عالية',
                    projectId: projectId,
                    listId: 'default',
                  });
                }
              }}>
                إضافة المهمة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Step Dialog */}
      <Dialog open={showNewStepDialog} onOpenChange={setShowNewStepDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>خطوة جديدة</DialogTitle>
            <DialogDescription>أضف خطوة جديدة للمشروع</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">اسم الخطوة</label>
              <Input
                placeholder="أدخل اسم الخطوة"
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">الوصف</label>
              <Textarea
                placeholder="أدخل وصف الخطوة"
                value={newStepDescription}
                onChange={(e) => setNewStepDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">مدة الخطوة (بالأيام)</label>
              <Input
                type="number"
                placeholder="عدد الأيام"
                value={newStepDuration}
                onChange={(e) => setNewStepDuration(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">تاريخ البداية</label>
              <Input
                type="date"
                value={newStepStartDate}
                onChange={(e) => setNewStepStartDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewStepDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={() => {
                if (newStepName.trim() && projectId) {
                  // TODO: Call createStep mutation
                  setShowNewStepDialog(false);
                  setNewStepName('');
                  setNewStepDescription('');
                  setNewStepDuration('');
                  setNewStepStartDate('');
                }
              }}>
                إضافة الخطوة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Requirement Dialog */}
      <Dialog open={showNewRequirementDialog} onOpenChange={setShowNewRequirementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>احتياج جديد</DialogTitle>
            <DialogDescription>أضف احتياج جديد للمشروع</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">اسم الاحتياج</label>
              <Input
                placeholder="مثل: مواد أولية, معدات, موظفين"
                value={newRequirementName}
                onChange={(e) => setNewRequirementName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">نوع الاحتياج</label>
              <select
                value={newRequirementType}
                onChange={(e) => setNewRequirementType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="resource">موارد</option>
                <option value="material">مواد</option>
                <option value="budget">ميزانية</option>
                <option value="personnel">موظفين</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">الكمية</label>
              <Input
                type="number"
                placeholder="عدد الوحدات"
                value={newRequirementQuantity}
                onChange={(e) => setNewRequirementQuantity(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">التكلفة (اختياري)</label>
              <Input
                type="number"
                placeholder="u0627لتكلفة الإجمالية"
                value={newRequirementCost}
                onChange={(e) => setNewRequirementCost(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewRequirementDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={() => {
                if (newRequirementName.trim() && projectId) {
                  // TODO: Call createRequirement mutation
                  setShowNewRequirementDialog(false);
                  setNewRequirementName('');
                  setNewRequirementType('resource');
                  setNewRequirementQuantity('');
                  setNewRequirementCost('');
                }
              }}>
                إضافة الاحتياج
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Project Generation Dialog */}
      <AIProjectGenerationDialog
        open={showAIGenerationDialog}
        onOpenChange={setShowAIGenerationDialog}
        projectId={projectId || ''}
        projectName={project?.name}
        onSuccess={() => {
          stepsQuery.refetch();
          requirementsQuery.refetch();
        }}
      />
    </div>
  );
}
