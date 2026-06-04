export type SecretaryRequestType =
  | 'CONTACT_RESEARCH'
  | 'EMAIL_OUTREACH'
  | 'PHONE_FOLLOWUP'
  | 'SCHEDULING'
  | 'COMPARISON'
  | 'REPORTING'
  | 'DATA_COLLECTION'
  | 'GENERAL_EXECUTION';

export type SecretaryRequestIntent = {
  type: SecretaryRequestType;
  city?: string;
  topic?: string;
  needsContacts: boolean;
  needsEmail: boolean;
  needsCalls: boolean;
  needsSchedule: boolean;
  needsTable: boolean;
  confidence: number;
};

function normalize(value: string) {
  return String(value || '').toLowerCase().replace(/[إأآا]/g, 'ا').replace(/[ة]/g, 'ه').replace(/[ى]/g, 'ي');
}

function findCity(text: string) {
  const cities = ['الرياض', 'جدة', 'جده', 'الدمام', 'الخبر', 'مكة', 'مكه', 'المدينة', 'المدينه', 'الطائف', 'بريدة', 'بريده'];
  return cities.find((city) => normalize(text).includes(normalize(city))) || '';
}

export function classifySecretaryRequest(input: string): SecretaryRequestIntent {
  const text = normalize(input);
  const needsContacts = /حصر|ابحث|بحث|جهات|عيادات|مراكز|شركات|موردين|ارقام|هواتف|عنوان|خريطه|بيانات/.test(text);
  const needsEmail = /ايميل|بريد|راسل|مراسله|مسوده|ارسال|رساله|عرض سعر/.test(text);
  const needsCalls = /اتصال|اتصل|كلم|هاتف|جوال|تابع/.test(text);
  const needsSchedule = /موعد|مواعيد|جدول|جدوله|تقويم|تذكير|زياره/.test(text);
  const needsTable = /جدول|اكسل|excel|قائمه|مقارنه|حصر/.test(text) || needsContacts;
  const comparison = /قارن|مقارنه|افضل|اسعار|تكلفه|عروض/.test(text);
  const reporting = /تقرير|ملخص|وش صار|النتائج|انجاز/.test(text);
  const city = findCity(input);
  let type: SecretaryRequestType = 'GENERAL_EXECUTION';
  if (needsContacts) type = 'CONTACT_RESEARCH';
  else if (needsEmail) type = 'EMAIL_OUTREACH';
  else if (needsCalls) type = 'PHONE_FOLLOWUP';
  else if (needsSchedule) type = 'SCHEDULING';
  else if (comparison) type = 'COMPARISON';
  else if (reporting) type = 'REPORTING';
  else if (/جمع|استخرج|رتب|نظم/.test(text)) type = 'DATA_COLLECTION';
  const confidence = [needsContacts, needsEmail, needsCalls, needsSchedule, needsTable, comparison, reporting].filter(Boolean).length / 7;
  return { type, city, topic: input.slice(0, 120), needsContacts, needsEmail, needsCalls, needsSchedule, needsTable, confidence: Math.max(0.35, Math.min(1, confidence + 0.35)) };
}
