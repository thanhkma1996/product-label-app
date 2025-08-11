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

