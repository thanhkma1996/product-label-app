import { useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page, Thumbnail, Layout, Button, TextField, EmptyState, TextContainer, Banner, Modal, ColorPicker, Card, Select, Tabs, ChoiceList, ResourceList
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
    const text = formData.get('text');
    const background = formData.get('background');
    const position = formData.get('position') || 'bottom-center';
    const condition = formData.get('condition'); // 'all' or 'specific'
    const productIds = formData.getAll('productIds'); // For 'specific' condition
    
    console.log('Action received:', { text, background, position, condition, productIds });
    
    if (!text || !background) {
      console.log('Missing required fields');
      return { error: 'Thiếu thông tin bắt buộc' };
    }
    
    const label = await prisma.label.create({
      data: { 
        text, 
        background, 
        position,
        condition: condition,
        productIds: condition === 'specific' ? productIds : undefined,
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
  if (
    typeof red !== "number" ||
    typeof green !== "number" ||
    typeof blue !== "number"
  ) {
    return "#000000"; // Giá trị mặc định nếu thiếu thông tin
  }
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
  const [labelHex, setLabelHex] = useState(hexFromRgb({ red: 0, green: 128, blue: 96 }));
  const [labelPosition, setLabelPosition] = useState("bottom-center");
  const [activeTab, setActiveTab] = useState(0);
  const [productCondition, setProductCondition] = useState(["all"]); // ["all"] or ["specific"]
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  const shop = loaderData.shop;
  const isSubmitting = navigation.state === "submitting";

  // Show success/error message
  useEffect(() => {
    if (actionData?.success) {
      setModalActive(false);
      setLabelText("");
      setLabelBg({ red: 0, green: 128, blue: 96 });
      setLabelHex("#008060");
      setLabelPosition("bottom-center");
      setProductCondition(["all"]);
      setSelectedProductIds([]);
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
  const openCreateLabelModal = () => {
    setLabelText("");
    setLabelBg({ red: 0, green: 128, blue: 96 });
    setLabelHex("#008060");
    setLabelPosition("bottom-center");
    setActiveTab(0);
    setProductCondition(["all"]);
    setSelectedProductIds([]);
    setModalActive(true);
  };

  const closeCreateLabelModal = () => {
    setModalActive(false);
    setLabelText("");
    setLabelBg({ red: 0, green: 128, blue: 96 });
    setLabelHex("#008060");
    setLabelPosition("bottom-center");
    setActiveTab(0);
    setProductCondition(["all"]);
    setSelectedProductIds([]);
  };

  const handleSaveLabel = async () => {
    if (!labelText.trim()) {
      return;
    }
    const formData = new FormData();
    formData.append('text', labelText);
    formData.append('background', hexFromRgb(labelBg));
    formData.append('position', labelPosition);
    if (productCondition[0] === "all") {
      formData.append('condition', 'all');
    } else {
      formData.append('condition', 'specific');
      selectedProductIds.forEach(id => formData.append('productIds', id));
    }
    // Submit form to action
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/app/labels';
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
          <div style={{ marginBottom: 24 }}>
            <Button primary onClick={openCreateLabelModal}>Tạo label</Button>
          </div>
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


          {/* Products Grid */}
          <div style={{ marginTop: 32 }}>
            <ResourceList
              resourceName={{ singular: "product", plural: "products" }}
              items={products}
              renderItem={(product) => (
                <ResourceList.Item id={product.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Thumbnail
                      source={product.featuredImage?.url || "https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"}
                      alt={product.title}
                      style={{ maxWidth: 100, width: 100, height: 'auto', objectFit: 'cover' }}
                    />
                    <div style={{ fontWeight: 500 }}>{product.title}</div>
                  </div>
                </ResourceList.Item>
              )}
            />
          </div>

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
        title="Tạo Label mới"
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
          <Tabs
            tabs={[
              { id: 'preview', content: 'Preview' },
              { id: 'product-conditions', content: 'Product conditions' },
            ]}
            selected={activeTab}
            onSelect={setActiveTab}
          >
            {activeTab === 0 && (
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
                        onChange={(color) => {
                          setLabelBg(color);
                          setLabelHex(hexFromRgb(color));
                        }}
                        color={labelBg}
                        allowAlpha={false}
                      />
                      <div style={{ marginTop: 8 }}>
                        <TextField
                          label="Mã màu (hex)"
                          value={labelHex}
                          onChange={(value) => {
                            setLabelHex(value);
                            let hex = value.trim().replace(/^#/, "");
                            if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
                              const r = parseInt(hex.slice(0, 2), 16);
                              const g = parseInt(hex.slice(2, 4), 16);
                              const b = parseInt(hex.slice(4, 6), 16);
                              setLabelBg({ red: r, green: g, blue: b });
                            }
                          }}
                          autoComplete="off"
                          placeholder="#008060"
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <Select
                        label="Vị trí label"
                        options={[
                          { label: "Trên trái (top-left)", value: "top-left" },
                          { label: "Trên giữa (top-center)", value: "top-center" },
                          { label: "Trên phải (top-right)", value: "top-right" },
                          { label: "Dưới trái (bottom-left)", value: "bottom-left" },
                          { label: "Dưới giữa (bottom-center)", value: "bottom-center" },
                          { label: "Dưới phải (bottom-right)", value: "bottom-right" },
                        ]}
                        value={labelPosition}
                        onChange={setLabelPosition}
                      />
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
                      <div style={{ width: 100, height: 100, background: '#eee', borderRadius: 8, margin: 'auto' }} />
                      {labelText && (
                        <div
                          style={{
                            position: 'absolute',
                            ...(labelPosition.startsWith('top') ? { top: 16 } : { bottom: 16 }),
                            ...(labelPosition.endsWith('left') ? { left: 16, transform: 'none' } :
                              labelPosition.endsWith('right') ? { right: 16, transform: 'none' } :
                              { left: '50%', transform: 'translateX(-50%)' }),
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
            {activeTab === 1 && (
              <div style={{ maxWidth: 400 }}>
                <ChoiceList
                  title="Điều kiện áp dụng label"
                  choices={[
                    { label: "Tất cả sản phẩm", value: "all" },
                    { label: "Chọn sản phẩm cụ thể", value: "specific" },
                  ]}
                  selected={productCondition}
                  onChange={setProductCondition}
                />
                {productCondition[0] === "specific" && (
                  <div style={{ marginTop: 16 }}>
                    <ResourceList
                      resourceName={{ singular: "product", plural: "products" }}
                      items={products}
                      selectedItems={selectedProductIds}
                      onSelectionChange={setSelectedProductIds}
                      selectable
                      renderItem={(product) => (
                        <ResourceList.Item id={product.id}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <Thumbnail
                              source={product.featuredImage?.url || "https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"}
                              alt={product.title}
                              style={{ maxWidth: 100, width: 100, height: 'auto', objectFit: 'cover' }}
                            />
                            <div style={{ fontWeight: 500 }}>{product.title}</div>
                          </div>
                        </ResourceList.Item>
                      )}
                    />
                  </div>
                )}
              </div>
            )}
          </Tabs>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export const headers = () => ({
  "Content-Type": "application/json"
});

export const unstable_shouldReload = () => false;
