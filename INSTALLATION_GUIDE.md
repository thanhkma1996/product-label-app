# Hướng dẫn cài đặt DO Product Label Extension

## 🎯 Mục tiêu
Hiển thị các label tùy chỉnh (đã tạo trong admin) lên product detail page của Shopify store.

## ✅ Đã hoàn thành

### 1. Extension đã được tạo và deploy
- ✅ Theme app extension: `do-label-product`
- ✅ App Proxy đã được cấu hình
- ✅ API endpoint: `/apps/doproductlabel/labels`
- ✅ Script JavaScript: `label-inject.js`
- ✅ CSS styles: `label-styles.css`

### 2. Cấu hình App Proxy
```toml
[app_proxy]
url = "https://generally-korea-normal-award.trycloudflare.com"
prefix = "apps"
subpath = "doproductlabel"
```

## 🚀 Cách cài đặt vào Theme

### Bước 1: Thêm snippet vào theme

Mở file `layout/theme.liquid` hoặc `sections/product-template.liquid` và thêm dòng sau:

```liquid
{% if template contains 'product' %}
  {% render 'do-label-inject' %}
{% endif %}
```

### Bước 2: Hoặc thêm block vào product template

1. Vào Shopify Admin → Online Store → Themes
2. Click "Customize" trên theme hiện tại
3. Chọn "Product pages"
4. Thêm section "DO Product Labels"

## 🔧 Cách hoạt động

1. **Customer truy cập product page**
2. **Extension load script** `label-inject.js`
3. **Script fetch labels** từ API endpoint
4. **Script inject labels** vào product image container
5. **Labels hiển thị** với styling và animation

## 🎨 Tính năng của Labels

- ✅ **Vị trí linh hoạt**: top-left, top-right, bottom-left, bottom-right, center
- ✅ **Màu sắc tùy chỉnh**: với contrast tự động
- ✅ **Responsive**: tự động điều chỉnh trên mobile
- ✅ **Animation**: fade-in effect mượt mà
- ✅ **Điều kiện hiển thị**: theo product ID cụ thể
- ✅ **Performance**: cache 5 phút, async loading

## 🐛 Troubleshooting

### Labels không hiển thị?

1. **Kiểm tra Console Browser**
   - Mở Developer Tools (F12)
   - Xem tab Console có lỗi gì không
   - Tìm log "DO Label: ..."

2. **Kiểm tra Network Tab**
   - Xem request đến `/apps/doproductlabel/labels`
   - Kiểm tra response có data không

3. **Kiểm tra Store Settings**
   - Đảm bảo store không có password protection
   - Kiểm tra theme có load script không

4. **Kiểm tra Extension**
   - Vào Shopify Admin → Apps → DO Product Label
   - Xem extension đã được install chưa

### CORS Errors?

App Proxy đã được cấu hình để tránh CORS. Nếu vẫn gặp lỗi:
- Kiểm tra App Proxy configuration
- Đảm bảo URL trong `shopify.app.toml` đúng

## 📱 Test

1. **Tạo label trong admin**
2. **Truy cập product page**
3. **Kiểm tra labels hiển thị**
4. **Test trên mobile**

## 🔄 Cập nhật

Để cập nhật extension:
```bash
shopify app deploy --force
```

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra console browser
2. Kiểm tra network requests
3. Xem app logs trong Shopify Partners
4. Đảm bảo store không có password protection

---

**Lưu ý**: Extension sẽ chỉ hoạt động trên product detail pages và khi store không có password protection. 