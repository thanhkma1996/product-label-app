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