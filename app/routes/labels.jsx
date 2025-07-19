import { useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page, Thumbnail, Layout, Button, TextField, EmptyState, TextContainer, Banner, Modal, ColorPicker, Card
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useCallback, useEffect } from "react";
import { prisma } from '../prisma.server';

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop || "Cửa hàng Shopify";
  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const search = url.searchParams.get("search") || "";
  const query = `#graphql
    query getProducts($first: Int!, $after: String, $query: String) {
      products(first: $first, after: $after, query: $query) {
        edges {
          cursor
          node {
            id
            title
            featuredImage { url }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;
  const variables = {
    first: 12,
    after,
    query: search ? `title:*${search}*` : undefined,
  };
  const response = await admin.graphql(query, { variables });
  const data = await response.json();
  const products = data.data.products.edges.map((edge) => ({ ...edge.node, cursor: edge.cursor }));
  const { hasNextPage, endCursor } = data.data.products.pageInfo;
  return { products, shop, hasNextPage, endCursor };
};

export const action = async ({ request }) => {
  try {
    const formData = await request.formData();
    const productId = formData.get('productId');
    const text = formData.get('text');
    const background = formData.get('background');
    const position = formData.get('position') || 'bottom-center';
    
    console.log('Action received:', { productId, text, background, position });
    
    if (!productId || !text || !background) {
      console.log('Missing required fields');
      return { error: 'Thiếu thông tin bắt buộc' };
    }
    
    const label = await prisma.label.create({
      data: { 
        productId, 
        text, 
        background, 
        position 
      }
    });
    
    console.log('Label created successfully:', label);
    return { success: true, label };
  } catch (error) {
    console.error('Error creating label:', error);
    return { error: 'Lỗi khi tạo label: ' + error.message };
  }
};

function hexFromRgb({ red, green, blue }) {
  return (
    "#" +
    [red, green, blue]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

export default function LabelsProductList() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [products, setProducts] = useState(loaderData.products);
  const [hasNextPage, setHasNextPage] = useState(loaderData.hasNextPage);
  const [endCursor, setEndCursor] = useState(loaderData.endCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalActive, setModalActive] = useState(false);
  const [labelText, setLabelText] = useState("");
  const [labelBg, setLabelBg] = useState({ red: 0, green: 128, blue: 96 });
  const [previewProduct, setPreviewProduct] = useState(null);

  const shop = loaderData.shop;
  const isSubmitting = navigation.state === "submitting";

  // Show success/error message
  useEffect(() => {
    if (actionData?.success) {
      setModalActive(false);
      setLabelText("");
      setLabelBg({ red: 0, green: 128, blue: 96 });
      setPreviewProduct(null);
    }
  }, [actionData]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const params = new URLSearchParams();
    if (endCursor) params.set("after", endCursor);
    if (searchValue) params.set("search", searchValue);
    const res = await fetch(`/labels?${params.toString()}`);
    const data = await res.json();
    setProducts((prev) => [...prev, ...data.products]);
    setHasNextPage(data.hasNextPage);
    setEndCursor(data.endCursor);
    setLoadingMore(false);
  };

  const handleSearchChange = useCallback((value) => {
    setSearchValue(value);
  }, []);

  const handleSearch = async () => {
    setSearching(true);
    const params = new URLSearchParams();
    if (searchValue) params.set("search", searchValue);
    const res = await fetch(`/labels?${params.toString()}`);
    const data = await res.json();
    setProducts(data.products);
    setHasNextPage(data.hasNextPage);
    setEndCursor(data.endCursor);
    setSearching(false);
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
  };

  const handleResetSelection = () => {
    setSelectedProduct(null);
  };

  // Modal logic
  const openCreateLabelModal = (product) => {
    setPreviewProduct(product);
    setLabelText("");
    setLabelBg({ red: 0, green: 128, blue: 96 });
    setModalActive(true);
  };

  const closeCreateLabelModal = () => {
    setModalActive(false);
    setPreviewProduct(null);
    setLabelText("");
    setLabelBg({ red: 0, green: 128, blue: 96 });
  };

  const handleSaveLabel = async () => {
    if (!labelText.trim() || !previewProduct) {
      return;
    }
    
    const formData = new FormData();
    formData.append('productId', previewProduct.id);
    formData.append('text', labelText);
    formData.append('background', hexFromRgb(labelBg));
    formData.append('position', 'bottom-center');
    
    // Submit form to action
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/labels';
    
    for (let [key, value] of formData.entries()) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  return (
    <Page>
      <TitleBar title="Quản lý Label sản phẩm" />
      <Layout>
        <Layout.Section>
          <TextContainer>
            <h2 style={{ fontWeight: 600, fontSize: 20, marginBottom: 16 }}>Cửa hàng: {shop}</h2>
          </TextContainer>
          
          {/* Search */}
          <div style={{ maxWidth: 400, marginBottom: 24 }}>
            <TextField
              label="Tìm kiếm sản phẩm"
              value={searchValue}
              onChange={handleSearchChange}
              onBlur={handleSearch}
              onEnterPressed={handleSearch}
              autoComplete="off"
              placeholder="Nhập tên sản phẩm..."
              connectedRight={<Button onClick={handleSearch} loading={searching}>Tìm</Button>}
            />
          </div>

          {/* Success/Error Messages */}
          {actionData?.success && (
            <Banner status="success" title="Thành công">
              Label đã được tạo thành công!
            </Banner>
          )}
          {actionData?.error && (
            <Banner status="critical" title="Lỗi">
              {actionData.error}
            </Banner>
          )}

          {/* Selected Product */}
          {selectedProduct && (
            <Banner status="success" title="Đã chọn sản phẩm">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* <Thumbnail 
                  source={selectedProduct.featuredImage?.url || "https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"}
                  alt={selectedProduct.title}
                  style={{ maxWidth: 100, width: 100, height: 'auto', objectFit: 'cover' }}
                /> */}
                <div>
                  <h3 style={{ fontWeight: 500, fontSize: 18, margin: 0 }}>{selectedProduct.title}</h3>
                  <Button plain onClick={handleResetSelection} style={{ marginTop: 8 }}>
                    Chọn lại sản phẩm khác
                  </Button>
                </div>
              </div>
            </Banner>
          )}

          {/* Products Grid */}
          {products.length === 0 ? (
            <EmptyState
              heading="Không tìm thấy sản phẩm nào"
              image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
            >
              <p>Hãy thử từ khóa khác hoặc kiểm tra lại sản phẩm trong cửa hàng của bạn.</p>
            </EmptyState>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
              {products.map((product) => (
                <div
                  key={product.id}
                  style={{
                    background: '#fff',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 20,
                    transition: 'box-shadow 0.2s',
                    position: 'relative',
                    border: selectedProduct?.id === product.id ? '2px solid #008060' : '1px solid #DFE3E8',
                  }}
                  onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
                  onMouseOut={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
                >
                  <Thumbnail 
                    source={product.featuredImage?.url || "https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"}
                    alt={product.title}
                    style={{ maxWidth: 100, width: 100, height: 'auto', objectFit: 'cover' }}
                  />
                  <h3 style={{ fontWeight: 500, fontSize: 16, margin: '16px 0 8px', textAlign: 'center' }}>{product.title}</h3>
                  <Button
                    fullWidth
                    primary
                    onClick={() => handleSelectProduct(product)}
                    disabled={selectedProduct?.id === product.id}
                    style={{ marginTop: 8, fontWeight: 600, background: selectedProduct?.id === product.id ? '#E3F1DF' : undefined }}
                  >
                    {selectedProduct?.id === product.id ? 'Đã chọn' : 'Chọn'}
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => openCreateLabelModal(product)}
                    style={{ marginTop: 8 }}
                  >
                    Create Label
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {hasNextPage && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Button onClick={handleLoadMore} loading={loadingMore} disabled={loadingMore}>
                Xem thêm sản phẩm
              </Button>
            </div>
          )}
        </Layout.Section>
      </Layout>

      {/* Create Label Modal */}
      <Modal
        open={modalActive}
        onClose={closeCreateLabelModal}
        title="Tạo Label cho sản phẩm"
        primaryAction={{
          content: "Lưu Label",
          onAction: handleSaveLabel,
          loading: isSubmitting,
          disabled: !labelText.trim() || isSubmitting,
        }}
        secondaryActions={[
          {
            content: "Hủy",
            onAction: closeCreateLabelModal,
          },
        ]}
        large
      >
        <Modal.Section>
          {previewProduct && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Config Panel */}
                <div style={{ minWidth: 200 }}>
                  <TextField
                    label="Tên Label"
                    value={labelText}
                    onChange={setLabelText}
                    autoComplete="off"
                    placeholder="Nhập tên label..."
                    error={!labelText.trim() && labelText !== "" ? "Tên label không được để trống" : ""}
                  />
                  <div style={{ marginTop: 16 }}>
                    <ColorPicker
                      onChange={setLabelBg}
                      color={labelBg}
                      allowAlpha={false}
                    />
                    <div style={{ marginTop: 8 }}>
                      <TextField
                        label="Mã màu (hex)"
                        value={hexFromRgb(labelBg)}
                        onChange={() => {}}
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* Preview Panel */}
                <div style={{ minWidth: 220, textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Preview</div>
                  <div style={{
                    position: 'relative',
                    width: 200,
                    height: 200,
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#F6F6F7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <img
                      src={previewProduct.featuredImage?.url || "https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"}
                      alt={previewProduct.title}
                      style={{ width: 100, maxWidth: 100, height: 'auto', objectFit: 'cover' }}
                    />
                    {labelText && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 16,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: hexFromRgb(labelBg),
                          color: '#fff',
                          padding: '6px 18px',
                          borderRadius: 20,
                          fontWeight: 600,
                          fontSize: 16,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                          letterSpacing: 1,
                        }}
                      >
                        {labelText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export const headers = () => ({
  "Content-Type": "application/json"
});

export const unstable_shouldReload = () => false;
