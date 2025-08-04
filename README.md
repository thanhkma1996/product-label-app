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

# Hien thi label ngoai FE
tại sao phải tạo API endpoint riêng thay vì truy cập trực tiếp database. Đây là lý do:

1. Customer truy cập store
   ↓
2. Shopify load theme extension
   ↓
3. Extension load label-inject.js (client-side)
   ↓
4. Script fetch data từ API endpoint
   ↓
5. API endpoint query database (server-side)
   ↓
6. Trả về JSON data
   ↓
7. Script render labels trên page