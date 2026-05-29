import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Users, FileText, Activity, MessageSquare, Upload, Plus, Trash2, Edit2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newComment, setNewComment] = useState('');

  // Queries
  const projectQuery = trpc.projects.getDetails.useQuery({ projectId: projectId || '' }, { enabled: !!projectId });
  const activitiesQuery = trpc.projects.getActivities.useQuery({ projectId: projectId || '' }, { enabled: !!projectId });
  const commentsQuery = trpc.projects.getComments.useQuery({ projectId: projectId || '' }, { enabled: !!projectId });
  const filesQuery = trpc.projects.getFiles.useQuery({ projectId: projectId || '' }, { enabled: !!projectId });
  const statsQuery = trpc.projects.getStatistics.useQuery({ projectId: projectId || '' }, { enabled: !!projectId });

  // Mutations
  const updateProjectMutation = trpc.projects.update.useMutation();
  const addMemberMutation = trpc.projects.addMember.useMutation();
  const removeMemberMutation = trpc.projects.removeMember.useMutation();
  const addCommentMutation = trpc.projects.addComment.useMutation();

  const project = projectQuery.data;
  const activities = activitiesQuery.data || [];
  const comments = commentsQuery.data || [];
  const files = filesQuery.data || [];
  const stats = statsQuery.data;

  useEffect(() => {
    if (project) {
      setEditData({
        name: project.name,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        priority: project.priority,
        status: project.status,
      });
    }
  }, [project]);

  const handleUpdateProject = async () => {
    if (!projectId) return;
    try {
      await updateProjectMutation.mutateAsync({
        id: projectId,
        ...editData,
      });
      setIsEditing(false);
      projectQuery.refetch();
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleAddMember = async () => {
    if (!projectId) {
      alert('الرجاء تحديث الصفحة');
      return;
    }
    if (!newMemberEmail) {
      alert('الرجاء إدخال بريد إلكتروني');
      return;
    }
    try {
      await addMemberMutation.mutateAsync({
        projectId,
        email: newMemberEmail,
        role: 'viewer',
      });
      setNewMemberEmail('');
      projectQuery.refetch();
      alert('✅ تم إضافة العضو بنجاح');
    } catch (error: any) {
      console.error('Failed to add member:', error);
      alert(`❌ فشل إضافة العضو: ${error?.message || 'خطأ غير معروف'}`);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!projectId) return;
    try {
      await removeMemberMutation.mutateAsync({
        projectId,
        memberId,
      });
      projectQuery.refetch();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleAddComment = async () => {
    if (!projectId || !newComment) return;
    try {
      await addCommentMutation.mutateAsync({
        projectId,
        content: newComment,
      });
      setNewComment('');
      commentsQuery.refetch();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

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

  const progressPercentage = project.statistics?.progress || 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="text-4xl">{project.icon}</div>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-gray-500">{project.description}</p>
          </div>
        </div>
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Edit2 className="w-4 h-4 mr-2" />
              تعديل
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل المشروع</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="اسم المشروع"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
              <Textarea
                placeholder="وصف المشروع"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
              <Input
                type="date"
                value={editData.startDate}
                onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
              />
              <Input
                type="date"
                value={editData.endDate}
                onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
              />
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={editData.priority}
                onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
              >
                <option value="منخفضة">منخفضة</option>
                <option value="متوسطة">متوسطة</option>
                <option value="عالية">عالية</option>
              </select>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={editData.status}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
              >
                <option value="active">نشط</option>
                <option value="on-hold">معلق</option>
                <option value="completed">مكتمل</option>
                <option value="archived">مؤرشف</option>
              </select>
              <Button onClick={handleUpdateProject} className="w-full">
                حفظ التغييرات
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المهام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المهام المكتملة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.completed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المهام المتبقية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.pending || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">نسبة الإنجاز</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.progress || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>تقدم المشروع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>نسبة الإنجاز</span>
              <span className="font-semibold">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="members">الأعضاء</TabsTrigger>
          <TabsTrigger value="activities">الأنشطة</TabsTrigger>
          <TabsTrigger value="comments">التعليقات</TabsTrigger>
          <TabsTrigger value="files">الملفات</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>أعضاء المشروع</CardTitle>
              <CardDescription>إدارة أعضاء المشروع والصلاحيات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Member */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
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
                    <Button onClick={handleAddMember} className="w-full">
                      إضافة
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Members List */}
              <div className="space-y-2">
                {project.members?.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{member.role}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>سجل الأنشطة</CardTitle>
              <CardDescription>آخر الأنشطة والتحديثات</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.map((activity: any) => (
                  <div key={activity.id} className="flex gap-3 pb-3 border-b last:border-b-0">
                    <Activity className="w-4 h-4 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {activity.userName} - {new Date(activity.createdAt).toLocaleString('ar-SA')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>التعليقات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment */}
              <div className="space-y-2">
                <Textarea
                  placeholder="أضف تعليقاً..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleAddComment} className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  إضافة تعليق
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-3 border-t pt-4">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{comment.userName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleString('ar-SA')}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>الملفات والمرفقات</CardTitle>
              <CardDescription>ملفات المشروع والمرفقات</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="mb-4">
                <Upload className="w-4 h-4 mr-2" />
                رفع ملف
              </Button>

              <div className="space-y-2">
                {files.map((file: any) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{file.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {file.uploadedBy} - {new Date(file.createdAt).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <Badge variant="outline">{file.fileType}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
