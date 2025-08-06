#1 Những lỗi thường gặp khi chỉnh sửa database trong schema.prisma và k update chạy npx prisma studio

"Invalid `STUDIO_EMBED_BUILD<"u"&&STUDIO_EMBED_BUILD?"

Cần chạy các lệnh sau để fix lối:
rm -rf node_modules/.prisma
rm -rf node_modules
rm -f package-lock.json # hoặc yarn.lock nếu dùng yarn

npm install
npm install prisma@latest @prisma/client@latest
npx prisma generate
npx prisma migrate dev
npx prisma studio

# Hiển thị Labels - Giải pháp vượt qua Password Protection

## Vấn đề với Development Store Password Protection

Khi development store có password protection, App Proxy không thể hoạt động vì:

- Store redirect tất cả requests đến `/password`
- App Proxy bị block bởi password protection
- Client-side script không thể fetch data

## Giải pháp đã triển khai:

### ✅ 1. Fallback System với Multiple Endpoints

Script sẽ thử các endpoint theo thứ tự:

1. `/apps/doproductlabel/labels` - App Proxy (khi không có password protection)
2. `https://cover-coating-exotic-lm.trycloudflare.com/api/labels/public` - Direct API (vượt qua password protection)

### ✅ 2. Public API Endpoint

- Tạo endpoint `/api/labels/public` không cần authentication
- Có thể truy cập trực tiếp từ bất kỳ domain nào
- Bypass hoàn toàn password protection

### ✅ 3. CORS Headers

- Đã set đúng CORS headers cho cross-origin requests
- Hỗ trợ cả GET và OPTIONS requests

## Cách hoạt động:

1. **Customer truy cập store** (có password protection)
   ↓
2. **Shopify load theme extension**
   ↓
3. **Extension load label-inject.js** (client-side)
   ↓
4. **Script thử App Proxy endpoint** (bị block bởi password)
   ↓
5. **Script fallback sang Public API** (hoạt động)
   ↓
6. **Public API query database** (server-side)
   ↓
7. **Trả về JSON data**
   ↓
8. **Script render labels trên page**

## Test Results:

- ✅ Public API: `https://cover-coating-exotic-lm.trycloudflare.com/api/labels/public` - Hoạt động
- ✅ App Proxy: `/apps/doproductlabel/labels` - Hoạt động khi không có password protection
- ✅ Fallback system: Tự động chuyển đổi giữa các endpoint

## Kết luận:

Labels sẽ hiển thị ngay cả khi store có password protection nhờ fallback system và public API endpoint.

// Test API enpoint
https://cover-coating-exotic-lm.trycloudflare.com/apps/doproductlabel/labels
