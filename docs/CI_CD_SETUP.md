# إعداد CI/CD واختبارات الجودة

يعتمد مشروع أثر على `pnpm` وTypeScript وVitest. قبل دمج أي Pull Request، يجب تشغيل فحص الأنواع واختبارات الوحدة والتكامل والبناء الإنتاجي.

## الفحوصات المحلية

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

## مسار GitHub Actions المقترح

أنشئ الملف `.github/workflows/quality.yml` بالمحتوى التالي. يحتاج إنشاء أو تعديل ملفات workflows إلى إذن GitHub خاص باسم `workflow`.

```yaml
name: Quality

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  quality:
    name: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm test
      - run: pnpm build
```

## حماية فرع `main`

بعد أول تشغيل ناجح لمسار الجودة، افتح **Settings → Branches** وأضف قاعدة حماية لفرع `main`. فعّل اشتراط Pull Request، موافقة مراجعة واحدة، نجاح فحص `quality`، وحل جميع المحادثات قبل الدمج. لا تربط نشر الإنتاج تلقائياً قبل تحديد بيئة staging وأسرارها.

## حالة التفعيل

جُرِّبت أوامر الجودة محلياً بنجاح: فحص الأنواع، و20 اختباراً، والبناء الإنتاجي. ملف workflow جاهز، ويحتاج فقط رفعه باتصال GitHub يملك إذن `workflow`.
