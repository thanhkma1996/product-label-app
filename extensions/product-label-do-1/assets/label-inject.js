(async function() {
    // Get current domain and construct API URLs
    const currentDomain = window.location.origin;
    const apiUrl = `${currentDomain}/apps/do-product-label/app/labels.json`;
    const testUrl = `${currentDomain}/apps/do-product-label/app/labels.test`;
  
    // Test endpoint first
    try {
      const testRes = await fetch(testUrl);
      if (testRes.ok) {
        const testData = await testRes.json();
        console.log('Product Label Extension: Test endpoint working:', testData);
      } else {
        console.error('Product Label Extension: Test endpoint failed:', testRes.status);
      }
    } catch (e) {
      console.error('Product Label Extension: Test endpoint error:', e);
    }
  
    // Fetch labels
    let labels = [];
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      labels = await res.json();
      console.log('Product Label Extension: Loaded', labels.length, 'labels');
    } catch (e) {
      console.error('Product Label Extension: Không thể lấy labels:', e);
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
  
    // Helper: Get product ID from various selectors
    function getProductId(element) {
      // Try different data attributes
      const productId = element.getAttribute('data-product-id') || 
                       element.getAttribute('data-product-handle') ||
                       element.getAttribute('data-product');
      
      if (productId) return productId;
      
      // Try to find product ID in child elements
      const productIdElement = element.querySelector('[data-product-id], [data-product-handle], [data-product]');
      if (productIdElement) {
        return productIdElement.getAttribute('data-product-id') || 
               productIdElement.getAttribute('data-product-handle') ||
               productIdElement.getAttribute('data-product');
      }
      
      return null;
    }
    
    // Helper: Check if label should be applied
    function shouldApplyLabel(label, productId) {
      if (label.condition === 'all') return true;
      if (label.condition === 'specific' && Array.isArray(label.productIds)) {
        return label.productIds.includes(productId);
      }
      return false;
    }
    
    // Apply labels to product cards (collection pages, search results, etc.)
    const productCardSelectors = [
      '.card-wrapper[data-product-id]',           // Dawn theme
      '.product-card[data-product-id]',           // Debut theme
      '[data-product-id]',                        // Generic
      '.product-item[data-product-id]',           // Other themes
      '.product[data-product-id]',                // Generic
      '[class*="product"][data-product-id]',      // Any class containing "product"
      '[class*="card"][data-product-id]'          // Any class containing "card"
    ];
    
    productCardSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(card => {
        const productId = getProductId(card);
        if (!productId) return;
        
        // Remove existing labels to avoid duplicates
        card.querySelectorAll('.shopify-label-badge').forEach(badge => badge.remove());
        
        labels.forEach(label => {
          if (shouldApplyLabel(label, productId)) {
            renderLabel(card, label);
          }
        });
      });
    });
    
    // Apply labels to product detail pages
    const productDetailSelectors = [
      '.product[data-product-id]',                // Dawn theme
      '.product-single[data-product-id]',         // Debut theme
      '.product-detail[data-product-id]',         // Other themes
      '[data-product-id]'                         // Generic
    ];
    
    productDetailSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(card => {
        const productId = getProductId(card);
        if (!productId) return;
        
        // Remove existing labels to avoid duplicates
        card.querySelectorAll('.shopify-label-badge').forEach(badge => badge.remove());
        
        labels.forEach(label => {
          if (shouldApplyLabel(label, productId)) {
            renderLabel(card, label);
          }
        });
      });
    });
    
    // Set up mutation observer to handle dynamic content (AJAX, infinite scroll, etc.)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              // Check if the added node is a product card
              const productCards = node.querySelectorAll ? node.querySelectorAll('[data-product-id]') : [];
              productCards.forEach(card => {
                const productId = getProductId(card);
                if (!productId) return;
                
                // Remove existing labels to avoid duplicates
                card.querySelectorAll('.shopify-label-badge').forEach(badge => badge.remove());
                
                labels.forEach(label => {
                  if (shouldApplyLabel(label, productId)) {
                    renderLabel(card, label);
                  }
                });
              });
              
              // Also check if the node itself is a product card
              if (node.getAttribute && node.getAttribute('data-product-id')) {
                const productId = getProductId(node);
                if (productId) {
                  // Remove existing labels to avoid duplicates
                  node.querySelectorAll('.shopify-label-badge').forEach(badge => badge.remove());
                  
                  labels.forEach(label => {
                    if (shouldApplyLabel(label, productId)) {
                      renderLabel(node, label);
                    }
                  });
                }
              }
            }
          });
        }
      });
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('Product Label Extension: Initialized successfully');
  })(); 