# Focus Flow Advanced AI Version

تمت إضافة حزمة خصائص متقدمة إلى الواجهة الحالية:

## المضاف

- AI Agents داخل التطبيق:
  - Planner Agent
  - Execution Agent
  - Calendar AI
  - Risk Agent
  - Memory Engine Agent
  - Notifications AI
- Memory Engine محلي يقرأ المشاريع والمهام والملاحظات ويستخرج Insights.
- Voice Assistant عبر Web Speech API عند دعم المتصفح.
- Smart Planning يولد مشروعًا ومهامًا وتواريخ داخل IndexedDB.
- Calendar AI يعطي توصيات جدولة ومتابعة.
- Notifications AI كقواعد ذكية جاهزة للتفعيل.
- Sync Engine محلي أولًا مع Google Drive Backup.
- Mobile Native Roadmap لتحويل PWA إلى تطبيق iOS/Android لاحقًا.
- Google OAuth Client ID جاهز من الإعدادات.
- Google Drive API integration موجودة في `client/src/lib/googleDriveCloud.ts`.

## المهم

Google OAuth وGoogle Drive API Key لا يمكن توليدها تلقائيًا من داخل المشروع. لازم تنشئها من حسابك في Google Cloud.

## خطوات Google Drive

1. افتح Google Cloud Console.
2. أنشئ Project جديد باسم Focus Flow.
3. فعّل Google Drive API.
4. من Credentials أنشئ OAuth Client ID.
5. اختر Web Application.
6. أضف رابط Vercel في Authorized JavaScript origins.
7. انسخ Client ID.
8. ضعه داخل صفحة Sync في التطبيق أو في متغير البيئة:
   `VITE_GOOGLE_CLIENT_ID`

لا تضع Client Secret داخل الواجهة.

## التخزين

- التخزين الأساسي: IndexedDB داخل الجوال.
- التخزين السحابي: Backup/Restore اختياري على Google Drive appDataFolder.
- التطبيق لا يعتمد على قاعدة بيانات خارجية في هذا الإصدار.

## Mobile Native

هذا الإصدار PWA. للتحويل لتطبيق حقيقي:

- أضف Capacitor.
- فعّل SQLite بدل IndexedDB.
- فعّل Push Notifications أصلية.
- اربط Voice Native.
- انشر عبر TestFlight وGoogle Play Internal Testing.
