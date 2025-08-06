# DO Product Label Extension

Extension này cho phép hiển thị các label tùy chỉnh trên product detail page của Shopify store.

## Cách cài đặt

### 1. Deploy extension
```bash
shopify app deploy
```

### 2. Thêm vào theme
Có 2 cách để thêm extension vào theme:

#### Cách 1: Sử dụng snippet (Khuyến nghị)
Thêm dòng sau vào file `layout/theme.liquid` hoặc `sections/product-template.liquid`:

```liquid
{% render 'do-label-inject' %}
```

#### Cách 2: Sử dụng block
Thêm block "DO Product Labels" vào product template thông qua theme customizer.

### 3. Cấu hình App Proxy
App Proxy đã được cấu hình tự động trong `shopify.app.toml`:
- Prefix: `apps/do-product-label`
- Subpath: `api`

## Tính năng

- ✅ Hiển thị labels trên product detail page
- ✅ Hỗ trợ nhiều vị trí (top-left, top-right, bottom-left, bottom-right, center)
- ✅ Màu sắc tùy chỉnh với contrast tự động
- ✅ Responsive design
- ✅ Animation mượt mà
- ✅ Hỗ trợ điều kiện hiển thị theo product ID

## Cấu trúc Label

Mỗi label có các thuộc tính:
- `text`: Nội dung hiển thị
- `background`: Màu nền (hex color)
- `position`: Vị trí hiển thị
- `condition`: Điều kiện hiển thị
- `productIds`: Danh sách product ID cụ thể

## Troubleshooting

### Labels không hiển thị
1. Kiểm tra console browser để xem lỗi
2. Đảm bảo store không có password protection
3. Kiểm tra App Proxy đã được cấu hình đúng
4. Xác nhận extension đã được deploy

### CORS errors
App Proxy đã được cấu hình để tránh CORS issues. Nếu vẫn gặp lỗi, kiểm tra:
- App Proxy configuration trong `shopify.app.toml`
- API endpoint có đúng CORS headers

## Support

Nếu gặp vấn đề, vui lòng kiểm tra:
1. Console browser
2. Network tab để xem API requests
3. Shopify app logs 