# Hướng dẫn start app 
- 1. Clone dự án from bitbucket: https://bitbucket.org/digitaloutlook/demo-shopify-app/src/feature_product_label/
- 2. Chạy câu lệnh: npm install và shopify app dev
- 3. Trong trường hợp chạy có lỗi liên quan tới authentication cần chạy câu lệnh: shopify auth list / shopify login 
- 4. Cập nhật manual: API_ENDPOINTS trong các file label-inject/collection-label/product-label, lí do cần bypass qua store development đang có mật khâu


# Hiển thị Labels - Giải pháp vượt qua Password Protection

## Vấn đề với Development Store Password Protection

Khi development store có password protection, App Proxy không thể hoạt động vì:

- Store redirect tất cả requests đến `/password`
- App Proxy bị block bởi password protection
- Client-side script không thể fetch data

## Giải pháp đã triển khai:


### ✅ Make Public API Endpoint

1. `/apps/doproductlabel/labels` - App Proxy (khi không có password protection)
2. `https://tune-lakes-order-apparently.trycloudflare.com/apps/doproductlabel/labels` - Direct API (vượt qua password protection)


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

- ✅ Public API: `https://relatives-harvest-boundaries-forums.trycloudflare.com/api/labels/public` - Hoạt động
- ✅ App Proxy: `/apps/doproductlabel/labels` - Hoạt động khi không có password protection
- ✅ Fallback system: Tự động chuyển đổi giữa các endpoint

## Kết luận:

Labels sẽ hiển thị ngay cả khi store có password protection nhờ fallback system và public API endpoint.

// Test API endpoints
https://tune-lakes-order-apparently.trycloudflare.com/apps/doproductlabel/labels => Create cloudflare Tunnel free

### Lưu ý về trycloudfare
```js [app_proxy]
url = "https://repeated-elementary-extras-stroke.trycloudflare.com"
prefix = "apps"
subpath = "doproductlabel"

```
=> Mỗi lần chạy npm run dev CLI sẽ in ra 1 URL trycloudflare.com, nên cần phải thay đổi lại path trong file label-inject.js
để đảm bảo client có thể truy cập được API 
- Đặc điểm của trycloudflare.com: URL sẽ được tạo ngẫu nhiên mỗi lần chạy npm run dev CLI


### Lưu ý về lưu trữ databse trong prisma dev.sqlite
- Khi tạo các label database sẽ được lữu trữ trong file dev.sqlite
- Nguyên nhân tại sao khi đã tạo db ở máy A nhưng sao máy B chạy không có dữ liệu bởi vì đã thêm vào file .gitignore vì vậy khi máy B  DB trống nên sẽ không có dữ liệu đã tạo


### Khi cap nhat database 
- Can su dung cac cau lenh sau de cập nhật database
```js
   - npx prisma migrate status
   - npx prisma db pull
   - npx prisma generate
   - npx prisma studio

```

### Một số lỗi hay gặp
- Mỗi số lỗi liên quan khi start app GraphiQL... cần chạy: shopify auth list để login auth và chạy lại

- Những lỗi thường gặp khi chỉnh sửa database trong schema.prisma và k update chạy npx prisma studio

```js 
rm -rf node_modules/.prisma
rm -rf node_modules
rm -f package-lock.json # hoặc yarn.lock nếu dùng yarn

npm install
npm install prisma@latest @prisma/client@latest
npx prisma generate
npx prisma migrate dev
npx prisma studio
```

File .env đã tồn tại nhưng bị ẩn khỏi workspace:
File .env thực sự đã được tạo bởi Shopify CLI khi bạn chạy shopify app env pull
File này bị ẩn khỏi workspace vì nó được liệt kê trong .gitignore 
Shopify CLI tự động quản lý biến môi trường thay vì yêu cầu bạn tạo file .env thủ công

=> Khi bạn chạy shopify app dev, CLI sẽ tự động:
Tạo file .env với các biến cần thiết
Lấy thông tin từ shopify.app.toml 
Cấu hình các biến môi trường cần thiết
=> File shopify.app.toml chứa:
client_id (tương đương SHOPIFY_API_KEY)
application_url (tương đương SHOPIFY_APP_URL)
scopes (tương đương SCOPES)

## Lưu ý 2 file database
- Trong project có 2 file code giống nhau đều kết nối db thông qua prisma orm là db.server.js & prisma.server.js tuy nhiên không thể xóa 1 trong 2 bởi bị

+ db.server.js = Synchronous context (webhooks, server setup) => Dùng cho Oauth
+ prisma.server.js = Dynamic context (app routes, lazy loading) => Tương tác dữ liệu trong app