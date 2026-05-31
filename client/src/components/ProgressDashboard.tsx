import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, TrendingUp, Clock, Users, AlertTriangle, Target, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

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
    if (rate >= 75) return 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]';
    if (rate >= 50) return 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]';
    return 'text-rose-400 drop-shadow-[0_0_10px_rgba(251,113,133,0.5)]';
  };

  const getRiskStyles = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
      case 'high':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(225,29,72,0.15)]';
      default:
        return 'bg-white/5 text-white/70 border-white/10';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'low': return 'مخاطر منخفضة';
      case 'medium': return 'مخاطر متوسطة';
      case 'high': return 'مخاطر مرتفعة';
      default: return 'غير محدد';
    }
  };

  const daysRemaining = Math.max(0, Math.ceil(
    (metrics.estimatedCompletion.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  ));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-3xl">
          <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-primary/20 rounded-full blur-[80px]" />

          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  <Target className="w-6 h-6 text-primary" />
                  تقدم {projectName}
                </CardTitle>
                <CardDescription className="text-white/50 mt-1 text-base">
                  نظرة عامة على أداء المشروع ومعدلات الإنجاز
                </CardDescription>
              </div>
              <div className={`text-5xl font-black ${getCompletionColor(metrics.completionRate)}`}>
                {metrics.completionRate}%
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.completionRate}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-orange-400 rounded-full shadow-[0_0_15px_rgba(201,162,77,0.8)]"
                />
              </div>
              <div className="flex justify-between items-center text-sm font-medium text-white/60">
                <span>تم إنجاز {metrics.completedTasks} مهام</span>
                <span>إجمالي المهام: {metrics.totalTasks}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants} className="group">
          <Card className="h-full border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white/70">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                  <Clock className="w-4 h-4" />
                </div>
                الجدول الزمني
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">{daysRemaining}</div>
              <p className="text-xs text-white/40 mb-4">يوم متبقي للتسليم</p>
              <div className="pt-3 border-t border-white/10 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">في الموعد</span>
                  <span className="font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">{metrics.onTimeCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">متأخر</span>
                  <span className="font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-md">{metrics.delayedCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="group">
          <Card className="h-full border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white/70">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Activity className="w-4 h-4" />
                </div>
                صحة الميزانية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] mb-1">
                {Math.round((metrics.onBudgetCount / (metrics.onBudgetCount + metrics.overBudgetCount)) * 100) || 0}%
              </div>
              <p className="text-xs text-white/40 mb-4">ضمن النطاق المالي</p>
              <div className="pt-3 border-t border-white/10 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">آمن</span>
                  <span className="font-bold text-emerald-400">{metrics.onBudgetCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">تجاوز</span>
                  <span className="font-bold text-rose-400">{metrics.overBudgetCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="group">
          <Card className="h-full border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white/70">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                طاقة الفريق
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.3)] mb-1">
                {metrics.teamUtilization}%
              </div>
              <p className="text-xs text-white/40 mb-4">معدل الاستخدام</p>
              <div className="pt-3 mt-auto">
                <div className="bg-white/5 rounded-full h-2.5 overflow-hidden border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metrics.teamUtilization}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="group">
          <Card className="h-full border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white/70">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                مؤشر المخاطر
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center items-center gap-4">
              <Badge variant="outline" className={`px-4 py-2 text-sm border-2 rounded-xl w-full justify-center ${getRiskStyles(metrics.riskLevel)}`}>
                {getRiskLabel(metrics.riskLevel)}
              </Badge>
              <p className="text-xs text-white/50 text-center leading-relaxed">
                {metrics.riskLevel === 'low' && 'المسار آمن، لا توجد عوائق برمجية.'}
                {metrics.riskLevel === 'medium' && 'تنبيه: راقب الموارد والمهام المتأخرة.'}
                {metrics.riskLevel === 'high' && 'حرج: يتطلب تدخل إداري فوري.'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="space-y-3">
        {metrics.completionRate < 25 && (
          <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-200 backdrop-blur-md rounded-xl">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <AlertDescription className="ml-2 font-medium">
              التقدم بطيء جداً. يرجى إعادة تقييم الجدول الزمني للمشروع.
            </AlertDescription>
          </Alert>
        )}

        {metrics.delayedCount > 0 && (
          <Alert className="bg-rose-500/10 border-rose-500/30 text-rose-200 backdrop-blur-md rounded-xl">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <AlertDescription className="ml-2 font-medium">
              يوجد {metrics.delayedCount} مهام متأخرة قد تؤثر على موعد التسليم النهائي.
            </AlertDescription>
          </Alert>
        )}

        {metrics.completionRate >= 75 && metrics.delayedCount === 0 && metrics.riskLevel === 'low' && (
          <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-200 backdrop-blur-md rounded-xl">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <AlertDescription className="ml-2 font-medium">
              أداء استثنائي! المشروع يتقدم بثبات نحو النجاح.
            </AlertDescription>
          </Alert>
        )}
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border border-white/10 bg-gradient-to-br from-[#0a0a0a]/80 to-[#111]/80 backdrop-blur-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              رؤى وتوصيات النظام
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {metrics.completionRate < 50 && (
                <li className="flex items-start gap-3 text-sm text-white/70 bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                  <span>ننصح بزيادة الموارد أو مراجعة نطاق المشروع لتحسين معدلات الإنجاز الحالية.</span>
                </li>
              )}
              {metrics.delayedCount > 0 && (
                <li className="flex items-start gap-3 text-sm text-white/70 bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
                  <span>قم بإعادة جدولة المهام المتأخرة وتخصيص مطورين إضافيين لتفادي عنق الزجاجة.</span>
                </li>
              )}
              {metrics.teamUtilization > 80 && (
                <li className="flex items-start gap-3 text-sm text-white/70 bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
                  <span>الفريق يعمل بطاقة شبه قصوى. راقب مؤشرات الإرهاق (Burnout) بانتظام.</span>
                </li>
              )}
              {metrics.completionRate >= 90 && (
                <li className="flex items-start gap-3 text-sm text-white/70 bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span>المشروع في مراحله الأخيرة. يرجى توجيه التركيز نحو ضمان الجودة (QA) والاختبار.</span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ProgressDashboard;
