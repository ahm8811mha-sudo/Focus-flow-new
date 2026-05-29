# Focus Flow Premium UI + Local Memory + Google Drive Backup

هذه النسخة مبنية كواجهة Premium للجوال بأسلوب قريب من Apple: زجاجيات، بطاقات 3D، تنقل سفلي/علوي مناسب للجوال، وذاكرة محلية داخل الجهاز.

## التخزين

- التخزين الأساسي: IndexedDB داخل الجوال.
- يعمل بدون إنترنت.
- يمكن تصدير واستيراد نسخة JSON يدويًا.
- يوجد خيار اختياري للنسخ الاحتياطي إلى Google Drive.

## Google Drive Backup

هذه ليست قاعدة بيانات مباشرة، بل نسخة احتياطية اختيارية.
حتى يعمل الربط مع Google Drive تحتاج Google OAuth Client ID.

### الخطوات المختصرة

1. افتح Google Cloud Console.
2. أنشئ OAuth Client ID من نوع Web application.
3. أضف دومين Vercel في Authorized JavaScript origins، مثل:
   https://focus-flow-chatgpt.vercel.app
4. انسخ Client ID.
5. افتح Focus Flow > السحابة.
6. ضع Client ID واضغط حفظ.
7. اضغط ربط Google Drive.
8. اضغط رفع نسخة.

## ملاحظة مهمة

البيانات الأصلية تبقى على الجهاز. Google Drive فقط يحفظ نسخة احتياطية باسم:
focus-flow-premium-backup.json
داخل appDataFolder الخاص بالتطبيق.

## Vercel

الإعدادات الموجودة:
- Build Command: npm run build
- Install Command: npm install
- Output Directory: dist/public

