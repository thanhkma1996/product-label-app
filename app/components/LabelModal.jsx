import React from "react";
import {
  Modal,
  Tabs,
  TextField,
  Select,
  ChoiceList,
  ResourceList,
  Thumbnail,
  Button,
  Text,
} from "@shopify/polaris";
import { hexFromRgb } from "../utils/colorUtils.js";
import {
  LABEL_POSITIONS,
  PRODUCT_CONDITION_CHOICES,
  RULE_TYPE_CHOICES,
  MODAL_TABS,
} from "../utils/constants.js";
import {
  getMatchingSpecialPriceProductsCount,
  getMatchingNewArrivalProductsCount,
  getFilteredProducts,
  getCurrentRuleDescription,
} from "../utils/helperFunctions.js";

export default function LabelModal({
  modalActive,
  onClose,
  onSave,
  isSubmitting,
  activeTab,
  setActiveTab,
  labelText,
  setLabelText,
  labelBg,
  setLabelBg,
  labelHex,
  setLabelHex,
  labelPosition,
  setLabelPosition,
  productCondition,
  setProductCondition,
  ruleType,
  setRuleType,
  selectedProductIds,
  setSelectedProductIds,
  specialPriceFrom,
  setSpecialPriceFrom,
  specialPriceTo,
  setSpecialPriceTo,
  newArrivalDays,
  setNewArrivalDays,
  products,
  productSearchTerm,
  setProductSearchTerm,
  debouncedProductSearch,
  editLabel,
}) {
  return (
    <Modal
      open={modalActive}
      onClose={onClose}
      title="Create new label"
      primaryAction={{
        content: "Save label",
        onAction: onSave,
        loading: isSubmitting,
        disabled: !labelText.trim() || isSubmitting,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
        },
      ]}
      large
    >
      <Modal.Section>
        <Tabs tabs={MODAL_TABS} selected={activeTab} onSelect={setActiveTab}>
          {activeTab === 0 && (
            <PreviewTab
              labelText={labelText}
              setLabelText={setLabelText}
              labelBg={labelBg}
              setLabelBg={setLabelBg}
              labelHex={labelHex}
              setLabelHex={setLabelHex}
              labelPosition={labelPosition}
              setLabelPosition={setLabelPosition}
              editLabel={editLabel}
            />
          )}
          {activeTab === 1 && (
            <ProductConditionsTab
              productCondition={productCondition}
              setProductCondition={setProductCondition}
              ruleType={ruleType}
              setRuleType={setRuleType}
              selectedProductIds={selectedProductIds}
              setSelectedProductIds={setSelectedProductIds}
              specialPriceFrom={specialPriceFrom}
              setSpecialPriceFrom={setSpecialPriceFrom}
              specialPriceTo={specialPriceTo}
              setSpecialPriceTo={setSpecialPriceTo}
              newArrivalDays={newArrivalDays}
              setNewArrivalDays={setNewArrivalDays}
              products={products}
              productSearchTerm={productSearchTerm}
              setProductSearchTerm={setProductSearchTerm}
              debouncedProductSearch={debouncedProductSearch}
            />
          )}
        </Tabs>
      </Modal.Section>
    </Modal>
  );
}

function PreviewTab({
  labelText,
  setLabelText,
  labelBg,
  setLabelBg,
  labelHex,
  setLabelHex,
  labelPosition,
  setLabelPosition,
  editLabel,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
              options={LABEL_POSITIONS}
              value={labelPosition}
              onChange={setLabelPosition}
            />
          </div>
        </div>

        {/* Preview Panel */}
        <div style={{ minWidth: 220, textAlign: "center" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Preview</div>
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
                  background: hexFromRgb(labelBg),
                  color: "#fff",
                  padding: "6px 18px",
                  borderRadius: 20,
                  fontWeight: 600,
                  fontSize: 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                  letterSpacing: 1,
                  opacity: editLabel ? 1 : 0.8,
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
  );
}

function ProductConditionsTab({
  productCondition,
  setProductCondition,
  ruleType,
  setRuleType,
  selectedProductIds,
  setSelectedProductIds,
  specialPriceFrom,
  setSpecialPriceFrom,
  specialPriceTo,
  setSpecialPriceTo,
  newArrivalDays,
  setNewArrivalDays,
  products,
  productSearchTerm,
  setProductSearchTerm,
  debouncedProductSearch,
}) {
  return (
    <div style={{ maxWidth: 600 }}>
      {/* Current Rule Configuration */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          background: "#f8f9fa",
          borderRadius: 8,
          border: "1px solid #e1e3e5",
        }}
      >
        <h3
          style={{
            margin: "0 0 12px 0",
            fontSize: 16,
            fontWeight: 600,
            color: "#202223",
          }}
        >
          Current Rule Configuration
        </h3>
        <div style={{ fontSize: "14px", color: "#666" }}>
          {getCurrentRuleDescription(
            productCondition,
            ruleType,
            specialPriceFrom,
            specialPriceTo,
            newArrivalDays,
            selectedProductIds,
          )}
        </div>
      </div>

      <ChoiceList
        title="Condition apply label"
        choices={PRODUCT_CONDITION_CHOICES}
        selected={productCondition}
        onChange={setProductCondition}
      />

      {/* Rule Type Selection */}
      {productCondition[0] === "specific" && (
        <div style={{ marginTop: 16 }}>
          <ChoiceList
            title="Product selection method"
            choices={RULE_TYPE_CHOICES}
            selected={[ruleType]}
            onChange={(value) => setRuleType(value[0])}
          />
        </div>
      )}

      {/* Special Price Rule Configuration */}
      {(productCondition[0] === "special_price" ||
        (productCondition[0] === "specific" &&
          ruleType === "special_price")) && (
        <SpecialPriceRuleConfig
          specialPriceFrom={specialPriceFrom}
          setSpecialPriceFrom={setSpecialPriceFrom}
          specialPriceTo={specialPriceTo}
          setSpecialPriceTo={setSpecialPriceTo}
          products={products}
        />
      )}

      {/* New Arrival Rule Configuration */}
      {(productCondition[0] === "new_arrival" ||
        (productCondition[0] === "specific" && ruleType === "new_arrival")) && (
        <NewArrivalRuleConfig
          newArrivalDays={newArrivalDays}
          setNewArrivalDays={setNewArrivalDays}
          products={products}
        />
      )}

      {/* Manual Product Selection */}
      {productCondition[0] === "specific" && ruleType === "specific" && (
        <ManualProductSelection
          products={products}
          selectedProductIds={selectedProductIds}
          setSelectedProductIds={setSelectedProductIds}
          productSearchTerm={productSearchTerm}
          setProductSearchTerm={setProductSearchTerm}
          debouncedProductSearch={debouncedProductSearch}
        />
      )}
    </div>
  );
}

function SpecialPriceRuleConfig({
  specialPriceFrom,
  setSpecialPriceFrom,
  specialPriceTo,
  setSpecialPriceTo,
  products,
}) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        background: "#f6f6f7",
        borderRadius: 8,
      }}
    >
      <h3
        style={{
          margin: "0 0 16px 0",
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        Special Price Rule Configuration
      </h3>
      <p
        style={{
          margin: "0 0 16px 0",
          fontSize: 14,
          color: "#666",
        }}
      >
        Apply label to products with special prices within the specified range.
        This rule will automatically apply the label to products that have a
        compare-at-price (original price) within the specified range, indicating
        they are on sale.
      </p>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <TextField
          label="Price from ($)"
          type="number"
          value={specialPriceFrom}
          onChange={setSpecialPriceFrom}
          placeholder="0.00"
          min="0"
          step="0.01"
          autoComplete="off"
        />
        <TextField
          label="Price to ($)"
          type="number"
          value={specialPriceTo}
          onChange={setSpecialPriceTo}
          placeholder="999.99"
          min="0"
          step="0.01"
          autoComplete="off"
        />
      </div>
      <div style={{ marginTop: 12, fontSize: "14px", color: "#666" }}>
        Products with compare-at-price between ${specialPriceFrom || "0"} and $
        {specialPriceTo || "∞"} will get this label
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: "14px",
          color: "#008060",
          fontWeight: 500,
        }}
      >
        {getMatchingSpecialPriceProductsCount(
          products,
          specialPriceFrom,
          specialPriceTo,
        )}{" "}
        products currently match this rule
      </div>
    </div>
  );
}

function NewArrivalRuleConfig({ newArrivalDays, setNewArrivalDays, products }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        background: "#f6f6f7",
        borderRadius: 8,
      }}
    >
      <h3
        style={{
          margin: "0 0 16px 0",
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        New Arrival Rule Configuration
      </h3>
      <p
        style={{
          margin: "0 0 16px 0",
          fontSize: 14,
          color: "#666",
        }}
      >
        Apply label to products created within the specified number of days.
        This rule will automatically apply the label to newly added products,
        helping customers identify fresh inventory.
      </p>
      <TextField
        label="Days since creation"
        type="number"
        value={newArrivalDays}
        onChange={setNewArrivalDays}
        placeholder="30"
        min="1"
        max="365"
        autoComplete="off"
      />
      <div style={{ marginTop: 12, fontSize: 14, color: "#666" }}>
        Products created in the last {newArrivalDays} days will get this label
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: "14px",
          color: "#008060",
          fontWeight: 500,
        }}
      >
        {getMatchingNewArrivalProductsCount(products, newArrivalDays)} products
        currently match this rule
      </div>
    </div>
  );
}

function ManualProductSelection({
  products,
  selectedProductIds,
  setSelectedProductIds,
  productSearchTerm,
  setProductSearchTerm,
  debouncedProductSearch,
}) {
  return (
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
        <div style={{ marginTop: 8, fontSize: "14px", color: "#666" }}>
          {productSearchTerm ? (
            <>
              {productSearchTerm !== debouncedProductSearch ? (
                <span style={{ color: "#666", fontStyle: "italic" }}>
                  Searching...
                </span>
              ) : (
                <>
                  Showing{" "}
                  {getFilteredProducts(products, debouncedProductSearch).length}{" "}
                  of {products.length} products
                </>
              )}
            </>
          ) : (
            `Total ${products.length} products available`
          )}
        </div>
        <div style={{ marginTop: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button
              size="slim"
              onClick={() => {
                const filteredProducts = getFilteredProducts(
                  products,
                  debouncedProductSearch,
                );
                const filteredProductIds = filteredProducts.map((p) => p.id);
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
                const filteredProducts = getFilteredProducts(
                  products,
                  debouncedProductSearch,
                );
                const filteredProductIds = filteredProducts.map((p) => p.id);
                setSelectedProductIds((prev) =>
                  prev.filter((id) => !filteredProductIds.includes(id)),
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
        resourceName={{
          singular: "product",
          plural: "products",
        }}
        items={getFilteredProducts(products, debouncedProductSearch)}
        selectedItems={selectedProductIds}
        onSelectionChange={setSelectedProductIds}
        selectable
        emptyState={
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <Text as="p" variant="bodyMd" color="subdued">
              {productSearchTerm
                ? `No products found matching "${productSearchTerm}"`
                : "No products available"}
            </Text>
          </div>
        }
        renderItem={(product) => (
          <ResourceList.Item id={product.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
              <div style={{ fontWeight: 500 }}>{product.title}</div>
            </div>
          </ResourceList.Item>
        )}
      />
    </div>
  );
}
