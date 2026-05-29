import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, TrendingUp, Clock, Users, AlertTriangle } from 'lucide-react';

interface ProgressMetrics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  onTimeCount: number;
  delayedCount: number;
  onBudgetCount: number;
  overBudgetCount: number;
  teamUtilization: number;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedCompletion: Date;
}

interface ProgressDashboardProps {
  metrics: ProgressMetrics;
  projectName?: string;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  metrics,
  projectName = 'المشروع',
}) => {
  const getCompletionColor = (rate: number) => {
    if (rate >= 75) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'low':
        return '✅ منخفض';
      case 'medium':
        return '⚠️ متوسط';
      case 'high':
        return '🔴 مرتفع';
      default:
        return 'غير محدد';
    }
  };

  const daysRemaining = Math.ceil(
    (metrics.estimatedCompletion.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-transparent">
        <CardHeader>
          <CardTitle className="text-2xl">تقدم المشروع</CardTitle>
          <CardDescription>{projectName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Overall Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">الإنجاز الإجمالي</span>
                <span className={`text-3xl font-bold ${getCompletionColor(metrics.completionRate)}`}>
                  {metrics.completionRate}%
                </span>
              </div>
              <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                  style={{ width: `${metrics.completionRate}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {metrics.completedTasks} من {metrics.totalTasks} مهمة مكتملة
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Timeline Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              الجدول الزمني
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">{daysRemaining}</div>
              <p className="text-xs text-gray-600">يوم متبقي</p>
              <div className="pt-2 border-t space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>في الموعد:</span>
                  <span className="font-semibold text-green-600">{metrics.onTimeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>متأخر:</span>
                  <span className="font-semibold text-red-600">{metrics.delayedCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              💰 الميزانية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((metrics.onBudgetCount / (metrics.onBudgetCount + metrics.overBudgetCount)) * 100) || 0}%
              </div>
              <p className="text-xs text-gray-600">ضمن الميزانية</p>
              <div className="pt-2 border-t space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>ضمن الميزانية:</span>
                  <span className="font-semibold text-green-600">{metrics.onBudgetCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>تجاوز:</span>
                  <span className="font-semibold text-red-600">{metrics.overBudgetCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Utilization */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              استخدام الفريق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-purple-600">{metrics.teamUtilization}%</div>
              <p className="text-xs text-gray-600">معدل الاستخدام</p>
              <div className="pt-2">
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-purple-500"
                    style={{ width: `${metrics.teamUtilization}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Level */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              مستوى المخاطر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge className={`${getRiskColor(metrics.riskLevel)} w-full text-center justify-center`}>
                {getRiskLabel(metrics.riskLevel)}
              </Badge>
              <p className="text-xs text-gray-600 text-center mt-2">
                {metrics.riskLevel === 'low' && 'المشروع يسير بشكل جيد'}
                {metrics.riskLevel === 'medium' && 'هناك بعض المخاطر المحتملة'}
                {metrics.riskLevel === 'high' && 'هناك مخاطر عالية تحتاج متابعة'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Alerts */}
      <div className="space-y-3">
        {metrics.completionRate < 25 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              📊 تقدم المشروع بطيء. يرجى مراجعة الموارد والجدول الزمني.
            </AlertDescription>
          </Alert>
        )}

        {metrics.delayedCount > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ⏰ هناك {metrics.delayedCount} مهمة متأخرة عن الجدول الزمني.
            </AlertDescription>
          </Alert>
        )}

        {metrics.overBudgetCount > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              💰 هناك {metrics.overBudgetCount} بند تجاوز الميزانية المخطط لها.
            </AlertDescription>
          </Alert>
        )}

        {metrics.riskLevel === 'high' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              🔴 مستوى المخاطر مرتفع. يجب اتخاذ إجراءات فورية للتخفيف من المخاطر.
            </AlertDescription>
          </Alert>
        )}

        {metrics.completionRate >= 75 && metrics.delayedCount === 0 && metrics.riskLevel === 'low' && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✅ المشروع يسير بشكل ممتاز! استمر في هذا الأداء الرائع.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>التوصيات</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {metrics.completionRate < 50 && (
              <li>📈 زيادة الموارد أو تقليل نطاق المشروع لتحسين معدل الإنجاز</li>
            )}
            {metrics.delayedCount > 0 && (
              <li>⏰ إعادة جدولة المهام المتأخرة وتخصيص موارد إضافية</li>
            )}
            {metrics.overBudgetCount > 0 && (
              <li>💰 مراجعة التكاليف وتحديد فرص للتوفير</li>
            )}
            {metrics.teamUtilization > 80 && (
              <li>👥 الفريق مثقل بالعمل. قد تحتاج إلى إضافة موارد إضافية</li>
            )}
            {metrics.riskLevel === 'high' && (
              <li>🔴 تطوير خطة تخفيف المخاطر وتنفيذها بسرعة</li>
            )}
            {metrics.completionRate >= 90 && (
              <li>🎉 المشروع قريب من الانتهاء. ركز على الجودة والاختبار النهائي</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressDashboard;
