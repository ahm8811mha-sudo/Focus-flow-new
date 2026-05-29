# Focus Flow Local Memory

تم تحويل التطبيق إلى نظام Local First:

- التخزين داخل الجوال/المتصفح باستخدام IndexedDB.
- لا يحتاج قاعدة بيانات خارجية للمرحلة الأولى.
- يعمل كـ PWA وقابل للاستخدام من الجوال.
- يحتوي على مشاريع، مهام، كانبان، تقويم، ملاحظات، وكلاء AI محليين.
- يوجد تصدير واستيراد JSON من صفحة الإعدادات كنسخة احتياطية.

## ملفات الذاكرة المحلية

- `client/src/lib/localMemory.ts`
- `client/src/hooks/useLocalMemory.ts`
- `client/src/pages/LocalFocusFlow.tsx`

## النشر على Vercel

- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: `dist/public`

## ملاحظة مهمة

البيانات محفوظة على نفس الجهاز والمتصفح. إذا حذفت بيانات Safari/Chrome ستفقد البيانات إلا إذا صدّرت نسخة احتياطية JSON.
