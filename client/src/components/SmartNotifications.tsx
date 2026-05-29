import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, AlertCircle, CheckCircle2, Clock, AlertTriangle, Trash2, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Notification {
  id: string;
  type: 'deadline' | 'budget' | 'risk' | 'milestone' | 'team' | 'system';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
  read: boolean;
  actionable: boolean;
  action?: () => void;
}

interface SmartNotificationsProps {
  notifications: Notification[];
  onDismiss?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  onAction?: (id: string) => void;
}

export const SmartNotifications: React.FC<SmartNotificationsProps> = ({
  notifications,
  onDismiss,
  onMarkAsRead,
  onAction,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    deadline: true,
    budget: true,
    risk: true,
    milestone: true,
    team: true,
    system: true,
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'deadline':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'budget':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'risk':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'milestone':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'team':
        return <Bell className="w-5 h-5 text-blue-500" />;
      case 'system':
        return <Settings className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'deadline':
        return '⏰ موعد نهائي';
      case 'budget':
        return '💰 ميزانية';
      case 'risk':
        return '⚠️ مخاطر';
      case 'milestone':
        return '🎯 مرحلة';
      case 'team':
        return '👥 فريق';
      case 'system':
        return '⚙️ نظام';
      default:
        return 'إشعار';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalCount = notifications.filter(n => n.severity === 'critical').length;

  const filteredNotifications = notifications.filter(
    n => notificationSettings[n.type as keyof typeof notificationSettings]
  );

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    // Critical first
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (a.severity !== 'critical' && b.severity === 'critical') return 1;
    // Unread first
    if (!a.read && b.read) return -1;
    if (a.read && !b.read) return 1;
    // Recent first
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
    if (diffHours < 24) return `قبل ${diffHours} ساعة`;
    if (diffDays < 7) return `قبل ${diffDays} يوم`;
    return date.toLocaleDateString('ar-SA');
  };

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div>
            <h3 className="font-semibold">الإشعارات</h3>
            <p className="text-sm text-gray-600">
              {unreadCount} غير مقروء
              {criticalCount > 0 && ` • ${criticalCount} حرج`}
            </p>
          </div>
        </div>
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Settings className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إعدادات الإشعارات</DialogTitle>
              <DialogDescription>اختر أنواع الإشعارات التي تريد تلقيها</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {Object.entries(notificationSettings).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        [key]: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{getTypeLabel(key)}</span>
                </label>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Critical Alerts */}
      {sortedNotifications.filter(n => n.severity === 'critical').length > 0 && (
        <div className="space-y-2">
          {sortedNotifications
            .filter(n => n.severity === 'critical')
            .map(notification => (
              <Alert key={notification.id} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{notification.title}</p>
                    <p className="text-sm">{notification.message}</p>
                  </div>
                  <div className="flex gap-2">
                    {notification.actionable && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAction?.(notification.id)}
                      >
                        إجراء
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDismiss?.(notification.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedNotifications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-400" />
              <p className="text-gray-500">لا توجد إشعارات</p>
            </CardContent>
          </Card>
        ) : (
          sortedNotifications.map(notification => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border-2 transition-all ${getSeverityColor(
                notification.severity
              )} ${!notification.read ? 'font-semibold' : 'opacity-75'}`}
              onClick={() => onMarkAsRead?.(notification.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(notification.type)}
                    </Badge>
                    <span className="text-xs text-gray-600">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                  <p className="font-semibold mt-1">{notification.title}</p>
                  <p className="text-sm mt-1">{notification.message}</p>
                  {notification.actionable && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction?.(notification.id);
                        }}
                      >
                        إجراء
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss?.(notification.id);
                        }}
                      >
                        إغلاق
                      </Button>
                    </div>
                  )}
                </div>
                {!notification.read && (
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notification Examples */}
      {sortedNotifications.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">أمثلة على الإشعارات الذكية</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-gray-600">
            <p>✅ تنبيهات المواعيد النهائية القادمة</p>
            <p>💰 تحذيرات تجاوز الميزانية</p>
            <p>⚠️ تنبيهات المخاطر المحتملة</p>
            <p>🎯 إشعارات إكمال المراحل</p>
            <p>👥 تحديثات الفريق والمسؤوليات</p>
            <p>⚙️ إشعارات النظام والصيانة</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartNotifications;
