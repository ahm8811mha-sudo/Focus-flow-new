import * as converter from 'hijri-converter';

const { Hijri, Gregorian } = converter as any;

export interface CalendarDate {
  gregorian: Date;
  hijri: {
    year: number;
    month: number;
    day: number;
  };
  formatted: {
    gregorian: string;
    hijri: string;
  };
}

export const hijriMonths = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الثانية',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

export const gregorianMonths = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export const weekDays = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

/**
 * Convert Gregorian date to Hijri date
 */
export function toHijri(date: Date): { year: number; month: number; day: number } {
  try {
    const gregorian = new (Gregorian as any)(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const hijri = gregorian.toHijri();
    return {
      year: hijri.year,
      month: hijri.month,
      day: hijri.day,
    };
  } catch (error) {
    // Fallback if converter fails
    return { year: 1445, month: 9, day: 1 };
  }
}

/**
 * Convert Hijri date to Gregorian date
 */
export function toGregorian(year: number, month: number, day: number): Date {
  try {
    const hijri = new (Hijri as any)(year, month, day);
    const gregorian = hijri.toGregorian();
    return new Date(gregorian.year, gregorian.month - 1, gregorian.day);
  } catch (error) {
    // Fallback if converter fails
    return new Date();
  }
}

/**
 * Get formatted date string for Gregorian calendar
 */
export function formatGregorianDate(date: Date): string {
  const day = date.getDate();
  const month = gregorianMonths[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Get formatted date string for Hijri calendar
 */
export function formatHijriDate(year: number, month: number, day: number): string {
  return `${day} ${hijriMonths[month - 1]} ${year}`;
}

/**
 * Get full calendar date info
 */
export function getCalendarDate(date: Date): CalendarDate {
  const hijri = toHijri(date);
  return {
    gregorian: date,
    hijri,
    formatted: {
      gregorian: formatGregorianDate(date),
      hijri: formatHijriDate(hijri.year, hijri.month, hijri.day),
    },
  };
}

/**
 * Get day name in Arabic
 */
export function getDayName(date: Date): string {
  return weekDays[date.getDay()];
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/**
 * Get dates between two dates
 */
export function getDatesBetween(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

/**
 * Get start of month
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get end of month
 */
export function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Get start of week (Sunday)
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

/**
 * Get end of week (Saturday)
 */
export function getWeekEnd(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + 6;
  return new Date(d.setDate(diff));
}

/**
 * Format date for input type="date"
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date from input type="date"
 */
export function parseDateFromInput(dateString: string): Date {
  return new Date(dateString + 'T00:00:00');
}

/**
 * Get relative date description (e.g., "اليوم", "غداً", "أمس")
 */
export function getRelativeDateDescription(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isToday(date)) return 'اليوم';
  if (date.toDateString() === tomorrow.toDateString()) return 'غداً';
  if (date.toDateString() === yesterday.toDateString()) return 'أمس';

  if (isPast(date)) return 'في الماضي';
  if (isFuture(date)) return 'في المستقبل';

  return formatGregorianDate(date);
}
