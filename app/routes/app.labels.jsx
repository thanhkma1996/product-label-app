import {
  useLoaderData,
  useActionData,
  useNavigation,
  useFetcher,
} from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page,
  Thumbnail,
  Layout,
  Button,
  TextField,
  TextContainer,
  Modal,
  Card,
  Select,
  Tabs,
  ChoiceList,
  ResourceList,
  Text,
  Badge,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useCallback, useEffect } from "react";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  const { prisma } = await import("../prisma.server");
  try {
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
      first: 100,
      after,
      query: search ? `title:*${search}*` : undefined,
    };
    const response = await admin.graphql(query, { variables });
    const data = await response.json();
    const products = data.data.products.edges.map((edge) => ({
      ...edge.node,
      cursor: edge.cursor,
    }));
    const { hasNextPage, endCursor } = data.data.products.pageInfo;
    // Lấy tất cả label từ Prisma
    const labels = await prisma.label.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { products, shop, hasNextPage, endCursor, labels };
  } catch (error) {
    // Nếu lỗi do thiếu shop domain/session, redirect về trang login
    return redirect(`/auth/login`);
  }
};

export const action = async ({ request }) => {
  const { prisma } = await import("../prisma.server");
  try {
    const formData = await request.formData();
    const actionType = formData.get("_action");
    if (actionType === "delete") {
      const id = formData.get("id");
      await prisma.label.delete({ where: { id } });
      return { success: true, deleted: id };
    }
    if (actionType === "edit") {
      // Chỉnh sửa label
      const id = formData.get("id");
      const text = formData.get("text");
      const background = formData.get("background");
      const position = formData.get("position") || "bottom-center";
      const condition = formData.get("condition");
      const productIds = formData.getAll("productIds");
      const updated = await prisma.label.update({
        where: { id },
        data: {
          text,
          background,
          position,
          condition,
          productIds: condition === "specific" ? productIds : [],
        },
      });
      return { success: true, updated };
    }
    if (actionType === "toggle") {
      // Toggle active status
      const id = formData.get("id");
      const currentLabel = await prisma.label.findUnique({ where: { id } });
      const updated = await prisma.label.update({
        where: { id },
        data: { active: !currentLabel.active },
      });
      return { success: true, updated };
    }
    if (actionType === "bulkActivate") {
      // Bulk activate labels
      const ids = formData.getAll("ids");
      if (ids.length > 0) {
        await prisma.label.updateMany({
          where: { id: { in: ids } },
          data: { active: true },
        });
        return { success: true, action: "bulkActivate", count: ids.length };
      }
      return { error: "No labels selected for bulk activation" };
    }
    if (actionType === "bulkDeactivate") {
      // Bulk deactivate labels
      const ids = formData.getAll("ids");
      if (ids.length > 0) {
        await prisma.label.updateMany({
          where: { id: { in: ids } },
          data: { active: false },
        });
        return { success: true, action: "bulkDeactivate", count: ids.length };
      }
      return { error: "No labels selected for bulk deactivation" };
    }
    const text = formData.get("text");
    const background = formData.get("background");
    const position = formData.get("position") || "bottom-center";
    const condition = formData.get("condition"); // 'all' or 'specific'
    const productIds = formData.getAll("productIds"); // For 'specific' condition

    console.log("Action received:", {
      text,
      background,
      position,
      condition,
      productIds,
    });

    if (!text || !background) {
      console.log("Missing required fields");
      return { error: "Thiếu thông tin bắt buộc" };
    }

    const label = await prisma.label.create({
      data: {
        text,
        background,
        position,
        condition: condition,
        productIds: condition === "specific" ? productIds : undefined,
        active: true, // Default to active
      },
    });

    console.log("Label created successfully:", label);
    return { success: true, label };
  } catch (error) {
    console.error("Error creating label:", error);
    return { error: "Lỗi khi tạo label: " + error.message };
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
  const fetcher = useFetcher();
  const [products, setProducts] = useState(loaderData.products);
  const [modalActive, setModalActive] = useState(false);
  const [labelText, setLabelText] = useState("");
  const [labelBg, setLabelBg] = useState({ red: 0, green: 128, blue: 96 });
  const [labelHex, setLabelHex] = useState(
    hexFromRgb({ red: 0, green: 128, blue: 96 }),
  );
  const [labelPosition, setLabelPosition] = useState("bottom-center");
  const [activeTab, setActiveTab] = useState(0);
  const [productCondition, setProductCondition] = useState(["all"]); // ["all"] or ["specific"]
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [editLabel, setEditLabel] = useState(null); // label đang chỉnh sửa
  const [labelFilter, setLabelFilter] = useState("all"); // "all", "active", "inactive"
  const [selectedLabelIds, setSelectedLabelIds] = useState([]); // For bulk actions
  const [loadingLabels, setLoadingLabels] = useState(new Set()); // Track loading state for individual labels
  const [bulkActionLoading, setBulkActionLoading] = useState(false); // Track bulk action loading
  const [productSearchTerm, setProductSearchTerm] = useState(""); // For product search
  const [debouncedProductSearch, setDebouncedProductSearch] = useState(""); // Debounced search term

  const shop = loaderData.shop;
  const isSubmitting = navigation.state === "submitting";
  const isFetcherSubmitting = fetcher.state === "submitting";
  const labels = loaderData.labels || [];

  // Debounce search term to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearch(productSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearchTerm]);

  // Filter labels based on active status
  const filteredLabels = labels.filter((label) => {
    if (labelFilter === "all") return true;
    if (labelFilter === "active") return label.active;
    if (labelFilter === "inactive") return !label.active;
    return true;
  });

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
      setEditLabel(null); // Reset edit state on success
      setSelectedLabelIds([]); // Reset selected labels on success

      // Reset all loading states on success
      setLoadingLabels(new Set());
      setBulkActionLoading(false);
    }

    // Handle errors
    if (actionData?.error) {
      console.error("Action error:", actionData.error);
      // Reset loading states on error
      setLoadingLabels(new Set());
      setBulkActionLoading(false);
    }
  }, [actionData]);

  // Reset loading states when fetcher state changes
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      // Reset loading states when fetcher completes
      setLoadingLabels(new Set());
      setBulkActionLoading(false);
    }
  }, [fetcher.state, fetcher.data]);

  // Debug: Track labelBg changes
  useEffect(() => {
    console.log("labelBg state changed:", labelBg);
  }, [labelBg]);

  // Khi submit chỉnh sửa label
  const handleEditLabel = (label) => {
    setEditLabel(label);
    setLabelText(label.text);
    setLabelBg(hexToRgb(label.background));
    setLabelHex(label.background);
    setLabelPosition(label.position);
    setProductCondition([label.condition]);
    setSelectedProductIds(
      Array.isArray(label.productIds) ? label.productIds : [],
    );
    setModalActive(true);
  };
  // Khi submit xóa label
  const handleDeleteLabel = (id) => {
    setLoadingLabels((prev) => new Set(prev).add(id));
    const formData = new FormData();
    formData.append("_action", "delete");
    formData.append("id", id);
    fetcher.submit(formData, { method: "post" });
  };

  // Khi toggle active status
  const handleToggleLabel = (id) => {
    try {
      setLoadingLabels((prev) => new Set(prev).add(id));
      const formData = new FormData();
      formData.append("_action", "toggle");
      formData.append("id", id);
      fetcher.submit(formData, { method: "post" });
    } catch (error) {
      console.error("Error toggling label:", error);
      setLoadingLabels((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };
  // Bulk activate labels
  const handleBulkActivate = () => {
    if (selectedLabelIds.length === 0) return;

    try {
      setBulkActionLoading(true);
      const formData = new FormData();
      formData.append("_action", "bulkActivate");
      selectedLabelIds.forEach((id) => {
        formData.append("ids", id);
      });
      fetcher.submit(formData, { method: "post" });
      setSelectedLabelIds([]);
    } catch (error) {
      console.error("Error bulk activating labels:", error);
      setBulkActionLoading(false);
    }
  };

  // Bulk deactivate labels
  const handleBulkDeactivate = () => {
    if (selectedLabelIds.length === 0) return;

    try {
      setBulkActionLoading(true);
      const formData = new FormData();
      formData.append("_action", "bulkDeactivate");
      selectedLabelIds.forEach((id) => {
        formData.append("ids", id);
      });
      fetcher.submit(formData, { method: "post" });
      setSelectedLabelIds([]);
    } catch (error) {
      console.error("Error bulk deactivating labels:", error);
      setBulkActionLoading(false);
    }
  };
  // Khi lưu label (tạo hoặc chỉnh sửa)
  const handleSaveLabel = async () => {
    if (!labelText.trim()) {
      return;
    }
    const formData = new FormData();
    formData.append("text", labelText);
    formData.append("background", hexFromRgb(labelBg));
    formData.append("position", labelPosition);
    if (productCondition[0] === "all") {
      formData.append("condition", "all");
    } else {
      formData.append("condition", "specific");
      selectedProductIds.forEach((id) => formData.append("productIds", id));
    }
    if (editLabel) {
      formData.append("_action", "edit");
      formData.append("id", editLabel.id);
    }
    // Submit form to action
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/app/labels";
    for (let [key, value] of formData.entries()) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };
  // Reset edit state khi đóng modal
  const closeCreateLabelModal = () => {
    setModalActive(false);
    setLabelText("");
    setLabelBg({ red: 0, green: 128, blue: 96 });
    setLabelHex("#008060");
    setLabelPosition("bottom-center");
    setActiveTab(0);
    setProductCondition(["all"]);
    setSelectedProductIds([]);
    setEditLabel(null);
    setProductSearchTerm(""); // Reset search term
    setDebouncedProductSearch(""); // Reset debounced search term
  };
  // Modal logic
  const openCreateLabelModal = () => {
    setEditLabel(null); // Đảm bảo là tạo mới, không phải edit
    setLabelText("");
    setLabelBg({ red: 0, green: 128, blue: 96 });
    setLabelHex("#008060");
    setLabelPosition("bottom-center");
    setActiveTab(0);
    setProductCondition(["all"]);
    setSelectedProductIds([]);
    setModalActive(true);
    setProductSearchTerm(""); // Reset search term
    setDebouncedProductSearch(""); // Reset debounced search term
  };
  // Helper: hex to rgb
  function hexToRgb(hex) {
    let c = hex.replace(/^#/, "");
    if (c.length === 3)
      c = c
        .split("")
        .map((x) => x + x)
        .join("");
    const num = parseInt(c, 16);
    return {
      red: (num >> 16) & 255,
      green: (num >> 8) & 255,
      blue: num & 255,
    };
  }

  return (
    <Page>
      <TitleBar title="DO Product Label" />
      <Layout>
        <Layout.Section>
          <TextContainer>
            <h2 style={{ fontWeight: 600, fontSize: 20, marginBottom: 16 }}>
              Product Label Management
            </h2>
            <p style={{ textAlign: "right", marginBottom: 20 }}>
              Develop by Thanh Nguyen
            </p>
          </TextContainer>
          <div
            style={{
              marginBottom: 24,
              display: "flex",
              gap: 16,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <Button primary onClick={openCreateLabelModal}>
                Create New Label
              </Button>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text as="span" variant="bodyMd">
                  Filter:
                </Text>
                <Select
                  label=""
                  labelInline
                  options={[
                    { label: "All Labels", value: "all" },
                    { label: "Active Only", value: "active" },
                    { label: "Inactive Only", value: "inactive" },
                  ]}
                  value={labelFilter}
                  onChange={setLabelFilter}
                />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Text as="span" variant="bodyMd" color="subdued">
                {labels.length} total labels
              </Text>
            </div>
          </div>
          {/* Danh sách List all label */}
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h3 style={{ fontWeight: 500, fontSize: 18, margin: 0 }}>
                Product Labels
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {selectedLabelIds.length > 0 && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      size="slim"
                      onClick={handleBulkActivate}
                      tone="success"
                      loading={bulkActionLoading}
                      disabled={bulkActionLoading}
                    >
                      Activate ({selectedLabelIds.length})
                    </Button>
                    <Button
                      size="slim"
                      onClick={handleBulkDeactivate}
                      tone="critical"
                      loading={bulkActionLoading}
                      disabled={bulkActionLoading}
                    >
                      Deactivate ({selectedLabelIds.length})
                    </Button>
                  </div>
                )}
                <Text as="span" variant="bodyMd" color="subdued">
                  Showing {filteredLabels.length} of {labels.length} labels
                </Text>
              </div>
            </div>
            {filteredLabels.length > 0 && (
              <div
                style={{
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    selectedLabelIds.length === filteredLabels.length &&
                    filteredLabels.length > 0
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLabelIds(
                        filteredLabels.map((label) => label.id),
                      );
                    } else {
                      setSelectedLabelIds([]);
                    }
                  }}
                  style={{ margin: 0 }}
                />
                <Text as="span" variant="bodyMd">
                  Select All ({filteredLabels.length})
                </Text>
              </div>
            )}
            {filteredLabels.length === 0 ? (
              <Text as="span" color="subdued">
                {labels.length === 0 ? "No label found." : "No label found."}
              </Text>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                {filteredLabels.map((label) => (
                  <Card key={label.id} sectioned>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 16 }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLabelIds.includes(label.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLabelIds([
                              ...selectedLabelIds,
                              label.id,
                            ]);
                          } else {
                            setSelectedLabelIds(
                              selectedLabelIds.filter((id) => id !== label.id),
                            );
                          }
                        }}
                        style={{ margin: 0 }}
                      />
                      <div
                        style={{
                          position: "relative",
                          minWidth: 80,
                          minHeight: 32,
                          background: label.background,
                          color: "#fff",
                          borderRadius: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 16px",
                          fontWeight: 600,
                          fontSize: 16,
                        }}
                      >
                        {label.text}
                        {/* Status indicator dot */}
                        <div
                          style={{
                            position: "absolute",
                            top: -4,
                            right: -4,
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: label.active ? "#00a47c" : "#ccc",
                            border: "2px solid #fff",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }}
                        />
                      </div>
                      <div>
                        <div>
                          <b>Position</b> {label.position}
                        </div>
                        <div>
                          <b>Condition</b> {label.condition}
                        </div>
                        <div>
                          <b>Status:</b>{" "}
                          <span
                            style={{
                              backgroundColor: label.active
                                ? "#00a47c"
                                : "#ccc",
                              color: "#fff",
                              borderRadius: "4px",
                              padding: "2px 8px",
                              fontSize: "12px",
                              maxWidth: "max-content",
                            }}
                          >
                            {label.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {label.condition === "specific" && (
                          <div>
                            <b>Products:</b>{" "}
                            {Array.isArray(label.productIds) &&
                            label.productIds.length > 0 ? (
                              <div style={{ marginTop: 4 }}>
                                {label.productIds.map((productId) => {
                                  const product = products.find(
                                    (p) => p.id === productId,
                                  );
                                  return product ? (
                                    <div
                                      key={productId}
                                      style={{
                                        display: "inline-block",
                                        background: "#f6f6f7",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        margin: "2px",
                                        fontSize: "12px",
                                      }}
                                    >
                                      {product.title}
                                    </div>
                                  ) : (
                                    <span
                                      key={productId}
                                      style={{ color: "#999" }}
                                    >
                                      {productId} (not found)
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ color: "#999" }}>
                                No products selected
                              </span>
                            )}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: "#888" }}>
                          Created at{" "}
                          {new Date(label.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div
                        style={{ marginLeft: "auto", display: "flex", gap: 8 }}
                      >
                        <Button
                          size="slim"
                          onClick={() => handleToggleLabel(label.id)}
                          tone={label.active ? "critical" : "success"}
                          loading={loadingLabels.has(label.id)}
                          disabled={loadingLabels.has(label.id)}
                        >
                          {label.active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="slim"
                          onClick={() => handleEditLabel(label)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="slim"
                          destructive
                          onClick={() => handleDeleteLabel(label.id)}
                          loading={loadingLabels.has(label.id)}
                          disabled={loadingLabels.has(label.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Layout.Section>
      </Layout>

      {/* Create Label Modal */}
      <Modal
        open={modalActive}
        onClose={closeCreateLabelModal}
        title="Create new label"
        primaryAction={{
          content: "Save label",
          onAction: handleSaveLabel,
          loading: isSubmitting,
          disabled: !labelText.trim() || isSubmitting,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: closeCreateLabelModal,
          },
        ]}
        large
      >
        <Modal.Section>
          <Tabs
            tabs={[
              { id: "preview", content: "Preview" },
              { id: "product-conditions", content: "Product conditions" },
            ]}
            selected={activeTab}
            onSelect={setActiveTab}
          >
            {activeTab === 0 && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 24 }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 32,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Config Panel */}
                  <div style={{ minWidth: 200 }}>
                    <TextField
                      label="Name Label"
                      value={labelText}
                      onChange={setLabelText}
                      autoComplete="off"
                      placeholder="Name label..."
                      error={
                        !labelText.trim() && labelText !== ""
                          ? "Name label is required"
                          : ""
                      }
                    />
                    <div style={{ marginTop: 16 }}>
                      {/* <ColorPicker
                        onChange={(color) => {
                          console.log("ColorPicker onChange called with:", color);
                          setLabelBg(color);
                          const hexColor = hexFromRgb(color);
                          console.log("Converted to hex:", hexColor);
                          setLabelHex(hexColor);
                        }}
                        onColorChange={(color) => {
                          console.log("ColorPicker onColorChange called with:", color);
                          setLabelBg(color);
                          const hexColor = hexFromRgb(color);
                          console.log("Converted to hex:", hexColor);
                          setLabelHex(hexColor);
                        }}
                        color={labelBg}
                        allowAlpha={false}
                        fullWidth
                      /> */}
                      <div style={{ marginTop: 8 }}>
                        <TextField
                          label="Color code (hex)"
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
                        <div style={{ marginTop: 8 }}>
                          <label
                            style={{
                              display: "block",
                              marginBottom: 4,
                              fontSize: "14px",
                            }}
                          >
                            Color picker:
                          </label>
                          <input
                            type="color"
                            value={labelHex}
                            onChange={(e) => {
                              console.log(
                                "HTML color input changed:",
                                e.target.value,
                              );
                              setLabelHex(e.target.value);
                              const hex = e.target.value.replace(/^#/, "");
                              const r = parseInt(hex.slice(0, 2), 16);
                              const g = parseInt(hex.slice(2, 4), 16);
                              const b = parseInt(hex.slice(4, 6), 16);
                              setLabelBg({ red: r, green: g, blue: b });
                            }}
                            style={{
                              width: "100%",
                              height: "40px",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <Select
                        label="Position label"
                        options={[
                          { label: "Top Left (top-left)", value: "top-left" },
                          {
                            label: "Top Center (top-center)",
                            value: "top-center",
                          },
                          {
                            label: "Top Right (top-right)",
                            value: "top-right",
                          },
                          {
                            label: "Bottom Left (bottom-left)",
                            value: "bottom-left",
                          },
                          {
                            label: "Bottom Center (bottom-center)",
                            value: "bottom-center",
                          },
                          {
                            label: "Bottom Right (bottom-right)",
                            value: "bottom-right",
                          },
                        ]}
                        value={labelPosition}
                        onChange={setLabelPosition}
                      />
                    </div>
                  </div>
                  {/* Preview Panel */}
                  <div style={{ minWidth: 220, textAlign: "center" }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Preview
                    </div>
                    <div
                      style={{
                        position: "relative",
                        width: 200,
                        height: 200,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#F6F6F7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 100,
                          height: 100,
                          background: "#eee",
                          borderRadius: 8,
                          margin: "auto",
                        }}
                      />
                      {labelText && (
                        <div
                          style={{
                            position: "absolute",
                            ...(labelPosition.startsWith("top")
                              ? { top: 16 }
                              : { bottom: 16 }),
                            ...(labelPosition.endsWith("left")
                              ? { left: 16, transform: "none" }
                              : labelPosition.endsWith("right")
                                ? { right: 16, transform: "none" }
                                : {
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                  }),
                            background: (() => {
                              const bgColor = hexFromRgb(labelBg);
                              console.log(
                                "Preview background color:",
                                bgColor,
                                "from labelBg:",
                                labelBg,
                              );
                              return bgColor;
                            })(),
                            color: "#fff",
                            padding: "6px 18px",
                            borderRadius: 20,
                            fontWeight: 600,
                            fontSize: 16,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                            letterSpacing: 1,
                            opacity: editLabel ? 1 : 0.8, // Show as slightly faded if not editing
                          }}
                        >
                          {labelText}
                        </div>
                      )}
                      {/* Status indicator */}
                      <div
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          background: "#fff",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "2px solid #ddd",
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: editLabel ? "#00a47c" : "#ccc",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 1 && (
              <div style={{ maxWidth: 400 }}>
                <ChoiceList
                  title="Condition apply label"
                  choices={[
                    { label: "All products", value: "all" },
                    { label: "Choose specific products", value: "specific" },
                  ]}
                  selected={productCondition}
                  onChange={setProductCondition}
                />
                {productCondition[0] === "specific" && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 16 }}>
                      <TextField
                        label="Search products"
                        value={productSearchTerm}
                        onChange={setProductSearchTerm}
                        placeholder="Search products by name..."
                        autoComplete="off"
                        connectedRight={
                          <Button
                            onClick={() => setProductSearchTerm("")}
                            disabled={!productSearchTerm}
                            size="slim"
                          >
                            Clear
                          </Button>
                        }
                      />
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: "14px",
                          color: "#666",
                        }}
                      >
                        {productSearchTerm ? (
                          <>
                            {productSearchTerm !== debouncedProductSearch ? (
                              <span
                                style={{ color: "#666", fontStyle: "italic" }}
                              >
                                Searching...
                              </span>
                            ) : (
                              <>
                                Showing{" "}
                                {
                                  products.filter((product) =>
                                    product.title
                                      .toLowerCase()
                                      .includes(
                                        debouncedProductSearch.toLowerCase(),
                                      ),
                                  ).length
                                }{" "}
                                of {products.length} products
                              </>
                            )}
                          </>
                        ) : (
                          `Total ${products.length} products available`
                        )}
                      </div>
                      <div style={{ marginTop: 12, marginBottom: 16 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <Button
                            size="slim"
                            onClick={() => {
                              const filteredProducts = products.filter(
                                (product) =>
                                  product.title
                                    .toLowerCase()
                                    .includes(
                                      debouncedProductSearch.toLowerCase(),
                                    ),
                              );
                              const filteredProductIds = filteredProducts.map(
                                (p) => p.id,
                              );
                              setSelectedProductIds((prev) => {
                                const newSelection = [...prev];
                                filteredProductIds.forEach((id) => {
                                  if (!newSelection.includes(id)) {
                                    newSelection.push(id);
                                  }
                                });
                                return newSelection;
                              });
                            }}
                          >
                            Select All Filtered
                          </Button>
                          <Button
                            size="slim"
                            onClick={() => {
                              const filteredProducts = products.filter(
                                (product) =>
                                  product.title
                                    .toLowerCase()
                                    .includes(
                                      debouncedProductSearch.toLowerCase(),
                                    ),
                              );
                              const filteredProductIds = filteredProducts.map(
                                (p) => p.id,
                              );
                              setSelectedProductIds((prev) =>
                                prev.filter(
                                  (id) => !filteredProductIds.includes(id),
                                ),
                              );
                            }}
                          >
                            Deselect All Filtered
                          </Button>
                          {selectedProductIds.length > 0 && (
                            <span style={{ fontSize: "14px", color: "#666" }}>
                              {selectedProductIds.length} product(s) selected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ResourceList
                      resourceName={{ singular: "product", plural: "products" }}
                      items={products.filter((product) =>
                        product.title
                          .toLowerCase()
                          .includes(debouncedProductSearch.toLowerCase()),
                      )}
                      selectedItems={selectedProductIds}
                      onSelectionChange={setSelectedProductIds}
                      selectable
                      emptyState={
                        <div
                          style={{ textAlign: "center", padding: "40px 20px" }}
                        >
                          <Text as="p" variant="bodyMd" color="subdued">
                            {productSearchTerm
                              ? `No products found matching "${productSearchTerm}"`
                              : "No products available"}
                          </Text>
                        </div>
                      }
                      renderItem={(product) => (
                        <ResourceList.Item id={product.id}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 16,
                            }}
                          >
                            <Thumbnail
                              source={
                                product.featuredImage?.url ||
                                "https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
                              }
                              alt={product.title}
                              style={{
                                maxWidth: 100,
                                width: 100,
                                height: "auto",
                                objectFit: "cover",
                              }}
                            />
                            <div style={{ fontWeight: 500 }}>
                              {product.title}
                            </div>
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
  "Content-Type": "application/json",
});

export const unstable_shouldReload = () => false;
