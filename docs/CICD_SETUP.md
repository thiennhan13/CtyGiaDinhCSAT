# CI/CD Setup Guide — CSAT Tutor Manager

> Hướng dẫn kết nối **GitHub Actions CI** + **Vercel CD** để tự động hoá quy trình kiểm tra và triển khai.

---

## Tổng quan Pipeline

```
Push code lên GitHub
        │
        ▼
┌──────────────────────────────────────────┐
│  GitHub Actions CI  (.github/workflows)  │
│                                          │
│  1. npm ci            (Cài dependencies) │
│  2. tsc --noEmit      (TypeScript check) │
│  3. npm run lint      (ESLint check)     │
│  4. npm run build     (Next.js build)    │
└──────────────┬───────────────────────────┘
               │  CI Pass ✅
               ▼
┌──────────────────────────────────────────┐
│  Vercel CD  (tự động kích hoạt)          │
│                                          │
│  • Preview Deploy  (Pull Requests)       │
│  • Production Deploy  (push lên main)    │
└──────────────────────────────────────────┘
```

---

## PHẦN A — GitHub Actions CI (Đã có sẵn trong file `.github/workflows/ci.yml`)

File CI đã được tạo. Không cần thao tác thêm gì về phía code.

---

## PHẦN B — Kết nối Vercel (CD)

### Bước 1: Push repo lên GitHub

Nếu repo chưa có trên GitHub, mở terminal và chạy:

```bash
# Khởi tạo repo (nếu chưa có)
git init
git add .
git commit -m "feat: khởi tạo dự án CSAT Tutor Manager"

# Tạo repo trên GitHub.com (thay YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/CtyGiaDinhCSAT.git
git branch -M main
git push -u origin main
```

### Bước 2: Kết nối Vercel với GitHub

1. Truy cập **[vercel.com](https://vercel.com)** và đăng nhập
2. Nhấn **"Add New Project"**
3. Chọn **"Import Git Repository"** → Chọn repo `CtyGiaDinhCSAT`
4. Cấu hình project:
   - **Framework Preset**: `Next.js` _(Vercel tự nhận diện)_
   - **Root Directory**: `./` _(để trống nếu code ở root)_
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Nhấn **"Deploy"** lần đầu để Vercel thiết lập project

### Bước 3: Thêm Environment Variables vào Vercel

Vào **Settings → Environment Variables** trong Vercel project và thêm:

| Variable Name | Môi trường |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development |
| `CRON_SECRET` | Production |

> **⚠️ Quan trọng**: `SUPABASE_SERVICE_ROLE_KEY` là secret — chỉ set cho **Production**, không bao giờ expose ra client.

### Bước 4: Thêm Secrets vào GitHub Actions

Để CI build được (bước `npm run build`), cần thêm secrets vào GitHub:

1. Truy cập **Settings → Secrets and variables → Actions** trong GitHub repo
2. Nhấn **"New repository secret"** và thêm lần lượt:

```
NEXT_PUBLIC_SUPABASE_URL      = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY     = eyJ...
CRON_SECRET                   = your-cron-secret
```

> Nếu không thêm secrets, CI vẫn chạy được nhờ giá trị placeholder trong workflow file,  
> nhưng khuyến nghị dùng secrets thật để build CI giống Production nhất.

---

## PHẦN C — Bật Vercel Deployment Status trên GitHub

Để mỗi Pull Request hiển thị trạng thái "Vercel Preview Deployed ✅":

1. Vào Vercel → Project Settings → **Git**
2. Mục **"GitHub Deployment Protection"**: Bật **"Required"**
3. Mục **"Preview Deployments"**: Giữ **Enabled**

Kết quả: Mỗi PR sẽ có 2 check:
- ✅ `CI — TypeCheck & Build` (GitHub Actions)
- ✅ `Vercel — Preview Deploy` (Vercel Bot)

---

## PHẦN D — Bảo vệ nhánh main (Khuyến nghị)

Để không ai push thẳng code lỗi lên Production:

1. GitHub → Settings → **Branches → Add branch protection rule**
2. Branch name pattern: `main`
3. Bật các tùy chọn:
   - ✅ **Require status checks to pass** → Chọn `CI — TypeCheck & Build`
   - ✅ **Require branches to be up to date** 
   - ✅ **Require pull request reviews** (tuỳ chọn)
   - ✅ **Restrict who can push** (tuỳ chọn)

---

## Tóm tắt luồng hoàn chỉnh sau khi setup

```
Developer → git push origin dev
                    │
                    ▼
           GitHub Actions chạy CI
           ├─ tsc --noEmit      → Pass ✅
           ├─ npm run lint      → Pass ✅
           └─ npm run build     → Pass ✅
                    │
                    ▼
            Tạo Pull Request: dev → main
                    │
                    ▼
           Vercel tạo Preview URL để test
                    │
                    ▼
            Merge Pull Request
                    │
                    ▼
           Vercel tự động deploy lên Production 🚀
```
