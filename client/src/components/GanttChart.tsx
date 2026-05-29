import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface GanttChartProps {
  steps: Array<{
    id: string;
    stepName: string;
    description?: string;
    estimatedDuration?: number;
    startDate?: string;
    stepOrder?: number;
  }>;
}

export const GanttChart: React.FC<GanttChartProps> = ({ steps }) => {
  const ganttData = useMemo(() => {
    if (!steps || steps.length === 0) {
      return [];
    }

    return steps
      .sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0))
      .map((step, index) => {
        const startDate = step.startDate ? new Date(step.startDate) : new Date();
        const duration = step.estimatedDuration || 1;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + duration);

        return {
          id: step.id,
          name: step.stepName || `الخطوة ${index + 1}`,
          start: startDate,
          end: endDate,
          progress: 0,
          dependencies: [],
          type: 'task',
        };
      });
  }, [steps]);

  const calculateProgress = (index: number) => {
    return Math.min(100, (index + 1) * 10);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysFromNow = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (!steps || steps.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">لا توجد خطوات لعرضها في الجدول الزمني</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>الجدول الزمني للمشروع</CardTitle>
          <CardDescription>عرض الخطوات والمدد الزمنية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Timeline Header */}
            <div className="grid grid-cols-12 gap-2 mb-4 text-xs font-semibold">
              <div className="col-span-3">الخطوة</div>
              <div className="col-span-2">البداية</div>
              <div className="col-span-2">النهاية</div>
              <div className="col-span-2">المدة</div>
              <div className="col-span-3">التقدم</div>
            </div>

            {/* Timeline Rows */}
            <div className="space-y-3">
              {ganttData.map((task, index) => {
                const daysFromStart = getDaysFromNow(task.start);
                const duration = Math.ceil(
                  (task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24)
                );
                const progress = calculateProgress(index);

                return (
                  <div key={task.id} className="space-y-1">
                    {/* Task Info */}
                    <div className="grid grid-cols-12 gap-2 text-sm">
                      <div className="col-span-3 font-medium truncate">{task.name}</div>
                      <div className="col-span-2 text-gray-600">
                        {formatDate(task.start)}
                      </div>
                      <div className="col-span-2 text-gray-600">
                        {formatDate(task.end)}
                      </div>
                      <div className="col-span-2 text-gray-600">{duration} أيام</div>
                      <div className="col-span-3 text-gray-600">{progress}%</div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Status Indicator */}
                    {daysFromStart < 0 && (
                      <div className="text-xs text-red-600">
                        ⚠️ متأخرة بـ {Math.abs(daysFromStart)} أيام
                      </div>
                    )}
                    {daysFromStart === 0 && (
                      <div className="text-xs text-orange-600">🔔 تبدأ اليوم</div>
                    )}
                    {daysFromStart > 0 && daysFromStart <= 3 && (
                      <div className="text-xs text-green-600">
                        ✓ تبدأ خلال {daysFromStart} أيام
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">إجمالي الخطوات</p>
                  <p className="text-2xl font-bold text-blue-600">{ganttData.length}</p>
                </div>
                <div>
                  <p className="text-gray-600">المدة الكلية</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.ceil(
                      (ganttData[ganttData.length - 1]?.end.getTime() -
                        ganttData[0]?.start.getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{' '}
                    يوم
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">متوسط التقدم</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(
                      ganttData.reduce((sum, _, i) => sum + calculateProgress(i), 0) /
                        ganttData.length
                    )}
                    %
                  </p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-blue-900">مفتاح الألوان:</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span>التقدم الفعلي</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-200 rounded-full" />
                <span>المتبقي</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GanttChart;
