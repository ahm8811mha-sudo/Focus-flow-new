import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BudgetData {
  category: string;
  estimated: number;
  actual: number;
  status: 'on-budget' | 'over-budget' | 'under-budget';
}

interface BudgetTrackingDashboardProps {
  budgetData: BudgetData[];
  totalEstimated: number;
  totalActual: number;
  currency?: string;
}

export const BudgetTrackingDashboard: React.FC<BudgetTrackingDashboardProps> = ({
  budgetData,
  totalEstimated,
  totalActual,
  currency = 'ر.س',
}) => {
  const totalVariance = totalActual - totalEstimated;
  const variancePercentage = totalEstimated > 0 ? (totalVariance / totalEstimated) * 100 : 0;
  const isOverBudget = totalActual > totalEstimated;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-budget':
        return 'bg-green-100 text-green-800';
      case 'under-budget':
        return 'bg-blue-100 text-blue-800';
      case 'over-budget':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on-budget':
        return '✅ ضمن الميزانية';
      case 'under-budget':
        return '💚 أقل من المتوقع';
      case 'over-budget':
        return '⚠️ تجاوز الميزانية';
      default:
        return 'غير محدد';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">الميزانية المقدرة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalEstimated.toLocaleString('ar-SA')} {currency}
            </div>
            <p className="text-xs text-gray-500 mt-1">إجمالي التكاليف المتوقعة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">التكاليف الفعلية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalActual.toLocaleString('ar-SA')} {currency}
            </div>
            <p className="text-xs text-gray-500 mt-1">ما تم إنفاقه فعلياً</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">الفرق</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              {isOverBudget ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {Math.abs(totalVariance).toLocaleString('ar-SA')} {currency}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isOverBudget ? 'تجاوز' : 'توفير'} ({Math.abs(variancePercentage).toFixed(1)}%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alert */}
      {isOverBudget && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ تم تجاوز الميزانية بمقدار {Math.abs(totalVariance).toLocaleString('ar-SA')} {currency}
            ({Math.abs(variancePercentage).toFixed(1)}%)
          </AlertDescription>
        </Alert>
      )}

      {/* Budget Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>تفصيل الميزانية حسب الفئة</CardTitle>
          <CardDescription>مقارنة التكاليف المقدرة مقابل الفعلية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {budgetData.map((item, index) => {
              const itemVariance = item.actual - item.estimated;
              const itemVariancePercentage = item.estimated > 0 ? (itemVariance / item.estimated) * 100 : 0;
              const progress = item.estimated > 0 ? (item.actual / item.estimated) * 100 : 0;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{item.category}</span>
                    </div>
                    <Badge className={getStatusColor(item.status)}>
                      {getStatusLabel(item.status)}
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        item.actual > item.estimated ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div>
                      <span>المقدر: {item.estimated.toLocaleString('ar-SA')} {currency}</span>
                      <span className="mx-2">|</span>
                      <span>الفعلي: {item.actual.toLocaleString('ar-SA')} {currency}</span>
                    </div>
                    <span className={itemVariance > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                      {itemVariance > 0 ? '+' : ''}{itemVariance.toLocaleString('ar-SA')} ({itemVariancePercentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Budget Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>التوصيات</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {isOverBudget ? (
              <>
                <li>⚠️ تم تجاوز الميزانية الإجمالية - يجب مراجعة النفقات</li>
                <li>💡 قم بمراجعة الفئات التي تجاوزت الميزانية</li>
                <li>📊 قد تحتاج إلى إعادة تخطيط المشروع أو زيادة الميزانية</li>
              </>
            ) : (
              <>
                <li>✅ المشروع ضمن الميزانية المخطط لها</li>
                <li>💚 استمر في المراقبة المنتظمة للنفقات</li>
                <li>📈 الفائض المتوقع: {Math.abs(totalVariance).toLocaleString('ar-SA')} {currency}</li>
              </>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetTrackingDashboard;
