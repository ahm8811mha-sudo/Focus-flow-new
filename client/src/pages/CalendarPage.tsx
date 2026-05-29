import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronLeft } from "lucide-react";
import {
  getCalendarDate,
  getMonthStart,
  getMonthEnd,
  getDatesBetween,
  formatGregorianDate,
  formatHijriDate,
  toHijri,
  gregorianMonths,
  hijriMonths,
  weekDays,
  getDayName,
  isToday,
  formatDateForInput,
} from "@/lib/calendarUtils";

type CalendarView = "gregorian" | "hijri";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("gregorian");
  const tasksQuery = trpc.tasks.list.useQuery();
  const tasks = tasksQuery.data || [];

  // Get tasks for current month
  const monthStart = getMonthStart(currentDate);
  const monthEnd = getMonthEnd(currentDate);
  const daysInMonth = getDatesBetween(monthStart, monthEnd);

  // Get first day of month and fill with previous month's days
  const firstDay = monthStart.getDay();
  const previousMonthEnd = new Date(monthStart);
  previousMonthEnd.setDate(0);
  const previousMonthDays = Array.from({ length: firstDay }, (_, i) => {
    const day = previousMonthEnd.getDate() - firstDay + i + 1;
    const date = new Date(previousMonthEnd.getFullYear(), previousMonthEnd.getMonth(), day);
    return date;
  });

  const calendarDays = [...previousMonthDays, ...daysInMonth];

  // Pad remaining days
  while (calendarDays.length % 7 !== 0) {
    const nextDay = new Date(monthEnd);
    nextDay.setDate(nextDay.getDate() + (calendarDays.length - daysInMonth.length - firstDay + 1));
    calendarDays.push(nextDay);
  }

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      try {
        const taskDate = new Date(task.dueDate);
        return (
          taskDate.getDate() === date.getDate() &&
          taskDate.getMonth() === date.getMonth() &&
          taskDate.getFullYear() === date.getFullYear()
        );
      } catch {
        return false;
      }
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const currentHijri = toHijri(currentDate);
  const monthName = view === "gregorian" 
    ? gregorianMonths[currentDate.getMonth()]
    : hijriMonths[currentHijri.month - 1];
  const year = view === "gregorian" ? currentDate.getFullYear() : currentHijri.year;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">التقويم</h1>
          <p className="text-muted-foreground mt-1">عرض المهام حسب التاريخ</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "gregorian" ? "default" : "outline"}
            onClick={() => setView("gregorian")}
            size="sm"
          >
            ميلادي
          </Button>
          <Button
            variant={view === "hijri" ? "default" : "outline"}
            onClick={() => setView("hijri")}
            size="sm"
          >
            هجري
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <Card className="p-6">
        {/* Month Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold">{monthName}</h2>
            <p className="text-muted-foreground">{year}</p>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Today Button */}
        <div className="flex justify-center mb-6">
          <Button variant="outline" size="sm" onClick={handleToday}>
            اليوم
          </Button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, index) => {
            const isCurrentMonth = 
              date.getMonth() === currentDate.getMonth() &&
              date.getFullYear() === currentDate.getFullYear();
            const tasksForDate = getTasksForDate(date);
            const isCurrentDay = isToday(date);

            return (
              <div
                key={index}
                className={`min-h-24 p-2 rounded-lg border transition-colors ${
                  isCurrentMonth
                    ? "bg-card border-border hover:bg-muted/50"
                    : "bg-muted/30 border-border/50 opacity-50"
                } ${isCurrentDay ? "ring-2 ring-accent" : ""}`}
              >
                <div className={`text-sm font-semibold mb-1 ${
                  isCurrentDay ? "text-accent" : ""
                }`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {tasksForDate.slice(0, 2).map(task => (
                    <div
                      key={task.id}
                      className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent truncate"
                    >
                      {task.name}
                    </div>
                  ))}
                  {tasksForDate.length > 2 && (
                    <div className="text-xs text-muted-foreground px-1.5">
                      +{tasksForDate.length - 2} مزيد
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Date Info */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">معلومات التاريخ</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">التاريخ الميلادي</p>
            <p className="text-lg font-semibold">{formatGregorianDate(currentDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">التاريخ الهجري</p>
            <p className="text-lg font-semibold">
              {formatHijriDate(currentHijri.year, currentHijri.month, currentHijri.day)}
            </p>
          </div>
        </div>
      </Card>

      {/* Tasks for Selected Date */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">المهام في {formatGregorianDate(currentDate)}</h3>
        <div className="space-y-2">
          {getTasksForDate(currentDate).length > 0 ? (
            getTasksForDate(currentDate).map(task => (
              <div key={task.id} className="p-3 bg-muted rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{task.name}</h4>
                    {task.dueTime && (
                      <p className="text-sm text-muted-foreground mt-1">
                        الوقت: {task.dueTime}
                      </p>
                    )}
                  </div>
                  {task.priority && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      task.priority === "عالية" ? "bg-red-100 text-red-700" :
                      task.priority === "متوسطة" ? "bg-yellow-100 text-yellow-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {task.priority}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">لا توجد مهام في هذا التاريخ</p>
          )}
        </div>
      </Card>
    </div>
  );
}
