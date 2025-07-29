(async function() {
    const apiUrl = '/apps/do-product-label/app/labels';
  
    // Fetch labels
    let labels = [];
    try {
      const res = await fetch(apiUrl);
      labels = await res.json();
    } catch (e) {
      console.error('Không thể lấy labels:', e);
      return;
    }
  
    // Helper: render label badge
    function renderLabel(card, label) {
      // Tránh render trùng
      if (card.querySelector('.shopify-label-badge[data-label-id="' + label.id + '"]')) return;
      const labelEl = document.createElement('div');
      labelEl.innerText = label.text;
      labelEl.style.background = label.background;
      labelEl.style.color = '#fff';
      labelEl.style.position = 'absolute';
      labelEl.style.zIndex = 10;
      labelEl.style.padding = '4px 16px';
      labelEl.style.borderRadius = '16px';
      labelEl.style.fontWeight = 'bold';
      labelEl.style.fontSize = '14px';
      labelEl.style.letterSpacing = '1px';
      labelEl.setAttribute('data-label-id', label.id);
      labelEl.className = 'shopify-label-badge';
  
      // Vị trí
      switch (label.position) {
        case 'top-left':
          labelEl.style.top = '12px';
          labelEl.style.left = '12px';
          break;
        case 'top-center':
          labelEl.style.top = '12px';
          labelEl.style.left = '50%';
          labelEl.style.transform = 'translateX(-50%)';
          break;
        case 'top-right':
          labelEl.style.top = '12px';
          labelEl.style.right = '12px';
          break;
        case 'bottom-left':
          labelEl.style.bottom = '12px';
          labelEl.style.left = '12px';
          break;
        case 'bottom-center':
          labelEl.style.bottom = '12px';
          labelEl.style.left = '50%';
          labelEl.style.transform = 'translateX(-50%)';
          break;
        case 'bottom-right':
          labelEl.style.bottom = '12px';
          labelEl.style.right = '12px';
          break;
        default:
          labelEl.style.top = '12px';
          labelEl.style.left = '12px';
      }
  
      // Đảm bảo card có position
      if (getComputedStyle(card).position === 'static') {
        card.style.position = 'relative';
      }
      card.appendChild(labelEl);
    }
  
    // Lặp qua từng sản phẩm trên trang (Dawn: .card-wrapper)
    document.querySelectorAll('.card-wrapper[data-product-id]').forEach(card => {
      const productId = card.getAttribute('data-product-id');
      if (!productId) return;
  
      labels.forEach(label => {
        if (
          label.condition === 'all' ||
          (label.condition === 'specific' && Array.isArray(label.productIds) && label.productIds.includes(productId))
        ) {
          renderLabel(card, label);
        }
      });
    });
  
    // Trang chi tiết sản phẩm (Dawn: .product[data-product-id])
    document.querySelectorAll('.product[data-product-id]').forEach(card => {
      const productId = card.getAttribute('data-product-id');
      if (!productId) return;
  
      labels.forEach(label => {
        if (
          label.condition === 'all' ||
          (label.condition === 'specific' && Array.isArray(label.productIds) && label.productIds.includes(productId))
        ) {
          renderLabel(card, label);
        }
      });
    });
  })();