# Lateen Notes - Production Ready 3D

هذه النسخة مجهزة للتشغيل كمنصة Production بواجهة 3D، مع الحفاظ على خصائص التطبيق الحالية ومساراته وقاعدة بياناته.

## أهم ما تم تجهيزه

- واجهة رئيسية 3D داكنة/ذهبية.
- إصلاح ربط الصفحة الرئيسية مع `trpc.projects.list` بدل مسار غير موجود.
- منع إعادة توجيه الزائر غير المسجل بسبب طلبات API محمية.
- تحسين Three.js لمنع تسريب animation frames عند التنقل بين الصفحات.
- PWA للجوال: manifest، service worker، icons، offline page.
- Dockerfile للنشر على VPS أو أي بيئة Docker.
- ملفات Render وRailway وVercel.
- Health check على `/api/health`.
- ملف `.env.example` كامل.

## التشغيل المحلي

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm build
pnpm start
```

ثم افتح:

```text
http://localhost:3000
http://localhost:3000/api/health
```

## قاعدة البيانات

التطبيق يعتمد على MySQL/Drizzle للبيانات الحقيقية. بعد تعبئة `DATABASE_URL` شغّل:

```bash
pnpm db:push
```

بدون قاعدة بيانات سيظهر الموقع وواجهة العرض، لكن البيانات الفعلية والعمليات المحمية لن تعمل.

## Render

1. ارفع المشروع إلى GitHub.
2. افتح Render واختر New Web Service.
3. سيقرأ Render ملف `render.yaml`.
4. أضف المتغيرات المطلوبة، خصوصاً `DATABASE_URL` وبيانات OAuth.
5. Deploy.

## Railway

1. ارفع المشروع إلى GitHub.
2. اختر Deploy from GitHub.
3. Railway سيقرأ `railway.json`.
4. أضف Environment Variables.
5. Deploy.

## Docker

```bash
docker build -t lateen-notes .
docker run --env-file .env -p 3000:3000 lateen-notes
```

## Vercel

تم تجهيز `vercel.json` و `api/index.ts`.

لكن بصراحة: Vercel ليس الخيار الأفضل لهذا المشروع إذا كان الاعتماد كبيراً على Express وقاعدة البيانات والجلسات. الأفضل Render أو Railway.

## متغيرات ضرورية

```text
DATABASE_URL
SESSION_SECRET
VITE_OAUTH_PORTAL_URL
VITE_APP_ID
OAUTH_CLIENT_ID
OAUTH_CLIENT_SECRET
OAUTH_CALLBACK_URL
```

## ملاحظة مهمة

لم يتم تضمين `node_modules` داخل ZIP. هذا صحيح. الاستضافة ستثبت الحزم من `pnpm-lock.yaml` أثناء النشر.
