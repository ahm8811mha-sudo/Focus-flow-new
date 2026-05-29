import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle, Share2, Users } from 'lucide-react';
import type { ProjectRequirement } from '@/types';

interface RequirementCardProps {
  requirement: ProjectRequirement;
  onComplete: (completed: boolean) => Promise<void>;
  onShare: (userIds: number[], permission: 'view' | 'edit' | 'comment') => Promise<void>;
  isLoading?: boolean;
  daysRemaining?: number;
  isOverdue?: boolean;
  sharedCount?: number;
}

export function RequirementCard({
  requirement,
  onComplete,
  onShare,
  isLoading = false,
  daysRemaining = 0,
  isOverdue = false,
  sharedCount = 0,
}: RequirementCardProps) {
  const [isCompleted, setIsCompleted] = useState((requirement as any).isCompleted || false);
  const [showShareInput, setShowShareInput] = useState(false);
  const [shareUserId, setShareUserId] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit' | 'comment'>('view');

  const handleCompleteToggle = async (checked: boolean) => {
    setIsCompleted(checked);
    try {
      await onComplete(checked);
    } catch (error) {
      setIsCompleted(!checked);
      console.error('Failed to update requirement:', error);
    }
  };

  const handleShare = async () => {
    if (!shareUserId) return;
    try {
      const userId = parseInt(shareUserId);
      if (isNaN(userId)) {
        alert('معرّف المستخدم يجب أن يكون رقماً');
        return;
      }
      await onShare([userId], sharePermission);
      setShareUserId('');
      setShowShareInput(false);
      alert('✅ تم مشاركة الاحتياج بنجاح');
    } catch (error) {
      console.error('Failed to share requirement:', error);
      alert('❌ فشل في مشاركة الاحتياج');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'عالية':
        return 'bg-red-100 text-red-800';
      case 'متوسطة':
        return 'bg-yellow-100 text-yellow-800';
      case 'منخفضة':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'allocated':
        return 'bg-purple-100 text-purple-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={`transition-all ${isCompleted ? 'opacity-75' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <div className="flex-shrink-0 pt-1">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={handleCompleteToggle}
              disabled={isLoading}
              className="w-5 h-5"
            />
          </div>

          {/* Content */}
          <div className="flex-grow">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className={`font-semibold ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {requirement.requirementName}
                </h4>
                {requirement.description && (
                  <p className="text-sm text-gray-600 mt-1">{requirement.description}</p>
                )}
              </div>

              {/* Status Icons */}
              <div className="flex gap-2">
                {isCompleted && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
                {isOverdue && !isCompleted && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
              </div>
            </div>

            {/* Badges and Info */}
            <div className="flex flex-wrap gap-2 mt-3">
              {requirement.priority && (
                <Badge className={`text-xs ${getPriorityColor(requirement.priority)}`}>
                  {requirement.priority}
                </Badge>
              )}
              {requirement.status && (
                <Badge className={`text-xs ${getStatusColor(requirement.status)}`}>
                  {requirement.status === 'pending' && 'قيد الانتظار'}
                  {requirement.status === 'allocated' && 'مخصص'}
                  {requirement.status === 'in_progress' && 'قيد التنفيذ'}
                  {requirement.status === 'completed' && 'مكتمل'}
                </Badge>
              )}
            </div>

            {/* Time and Cost Info */}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              {daysRemaining !== undefined && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {isOverdue ? (
                    <span className="text-red-600 font-medium">متأخر</span>
                  ) : (
                    <span>{daysRemaining} أيام متبقية</span>
                  )}
                </div>
              )}
              {requirement.estimatedCost && (
                <div>
                  💰 المقدر: {requirement.estimatedCost} ريال
                </div>
              )}
              {(requirement as any).actualCost && (
                <div>
                  💸 الفعلي: {(requirement as any).actualCost} ريال
                </div>
              )}
            </div>

            {/* Share Section */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>مشارك مع {sharedCount} مستخدم</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowShareInput(!showShareInput)}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  مشاركة
                </Button>
              </div>

              {/* Share Input */}
              {showShareInput && (
                <div className="mt-3 flex gap-2">
                  <Input
                    type="number"
                    placeholder="معرّف المستخدم"
                    value={shareUserId}
                    onChange={(e) => setShareUserId(e.target.value)}
                    className="flex-1"
                  />
                  <select
                    value={sharePermission}
                    onChange={(e) => setSharePermission(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="view">عرض</option>
                    <option value="edit">تعديل</option>
                    <option value="comment">تعليق</option>
                  </select>
                  <Button
                    size="sm"
                    onClick={handleShare}
                    disabled={isLoading || !shareUserId}
                  >
                    إرسال
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
