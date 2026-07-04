# Universal Data Analytics Platform — Backend/Frontend Edition

نسخة مقسّمة من تطبيق Streamlit الأصلي (`Req3_GUI.py`) لنفس الستاك اللي استخدمته في GradeOS:
**Node.js/Express + MongoDB** كـ backend، وواجهة **HTML/CSS/JS** منفصلة (بدون build tools) كـ frontend.

## البنية

```
project/
├── backend/                 # Express API
│   ├── server.js            # نقطة الدخول
│   ├── src/
│   │   ├── db.js            # اتصال MongoDB + الثوابت المشتركة
│   │   ├── schemaInference.js  # نفس منطق infer_schema بس بالجافاسكريبت
│   │   └── routes/
│   │       ├── dataset.js   # رفع/تحليل الملف، overview، export، danger zone
│   │       ├── records.js   # بحث/فلترة، CRUD، حذف soft/hard، استرجاع
│   │       └── analytics.js # نفس تحليلات الداشبورد (aggregation pipelines)
│   ├── package.json
│   └── .env.example
└── frontend/                 # React 19 + Vite (راجع frontend/README.md بالتفصيل)
    ├── index.html
    └── src/
        ├── pages/            # كل صفحة زي القديم بالظبط + نداءات نفس الـ API
        ├── components/, context/, api/, styles/
```

## هل احتفظنا بالمنطق نفسه؟

نعم — كل صفحة في الـ Streamlit القديم بقالها endpoint وصفحة مقابلة:

| صفحة Streamlit القديمة | Backend endpoint | Frontend page |
|---|---|---|
| 📤 Upload Dataset | `POST /api/dataset/upload` | رفع ملف |
| 📊 Dataset Overview | `GET /api/dataset/overview` | نظرة عامة |
| 🔍 Search & Filter | `POST /api/records/search` | بحث وفلترة |
| 🔎 Search by ID | `GET /api/records/find?id=` | بحث بالـ ID |
| ➕ Add Record | `POST /api/records` | إضافة سجل |
| ✏️ Edit Record | `PUT /api/records/:id` | تعديل سجل |
| 🗑️ Delete Record | `DELETE /api/records/:id`, `POST /api/records/bulk-delete`, `POST /api/records/:id/restore` | حذف سجل |
| 📊 Analytics Dashboard | `GET /api/analytics/*` | التحليلات |
| ⬇️ Download Dataset | `GET /api/dataset/export` | تصدير |

`infer_schema` بايثون كان بيستخدم pandas — اتحول لملف `schemaInference.js` بمنطق مطابق:
نسبة القيم الرقمية ≥ 90% → integer/float، ولو مش رقمية بنجرب تاريخ، ولو الاختلافات قليلة (≤ max(30, 5% من الصفوف)) بتتحسب categorical، غير ذلك text.
تم اختبار المنطق هذا بالفعل ويعطي نفس النتائج المتوقعة (integer/float/categorical/text مطابقة لأمثلة تجريبية).

## التشغيل محليًا

### 1) شغّل MongoDB
نفس اللي كنت بتعمله (mongod.exe أو `mongod` على لينكس/ماك).

### 2) شغّل الـ Backend
```bash
cd backend
cp .env.example .env      # عدّل القيم لو محتاج
npm install
npm start                 # هيشغل السيرفر على http://localhost:5000
```

### 3) شغّل الـ Frontend (React + Vite)
```bash
cd frontend
cp .env.example .env       # VITE_API_BASE=http://localhost:5000/api
npm install
npm run dev                # هيشغل الواجهة على http://localhost:5173
```
تفاصيل أكتر عن بنية الـ React app موجودة في `frontend/README.md`.

## ملاحظات مهمة

- الفرونت إند بقى React 19 + Vite + React Router، بواجهة إنجليزية بالكامل واحترافية أكتر (sidebar، schema fingerprint، إلخ). الـ backend اتسابه زي ما هو من غير أي تعديل.
- الـ Charts شغالة بـ Recharts (React) بدل Chart.js.
- استخدمت نفس منطق الـ soft-delete / hard-delete / restore / bulk-delete اللي كان في الكود الأصلي.
- ملف `Req2_Data_Insertion.py` و `Req4_Queries.py` (المشروع التعليمي الثابت الـ schema بتاع الطلاب) لسه بايثون زي ما هم — لو عايز أحولهم كمان لسكريبتات Node.js (مثلاً كـ seed script)، قولي.
