import React from "react";
import { Card, Button, Text, Badge } from "@shopify/polaris";
import { formatDate, getProductTitleById } from "../utils/helperFunctions.js";

export default function LabelList({
  filteredLabels,
  labels,
  products,
  selectedLabelIds,
  setSelectedLabelIds,
  handleToggleLabel,
  handleEditLabel,
  handleDeleteLabel,
  loadingLabels,
  bulkActionLoading,
  handleBulkActivate,
  handleBulkDeactivate,
}) {
  return (
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

      {/* Select All Checkbox */}
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
                setSelectedLabelIds(filteredLabels.map((label) => label.id));
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

      {/* Labels List */}
      {filteredLabels.length === 0 ? (
        <Text as="span" color="subdued">
          {labels.length === 0 ? "No label found." : "No label found."}
        </Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredLabels.map((label) => (
            <LabelCard
              key={label.id}
              label={label}
              products={products}
              selectedLabelIds={selectedLabelIds}
              setSelectedLabelIds={setSelectedLabelIds}
              handleToggleLabel={handleToggleLabel}
              handleEditLabel={handleEditLabel}
              handleDeleteLabel={handleDeleteLabel}
              loadingLabels={loadingLabels}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LabelCard({
  label,
  products,
  selectedLabelIds,
  setSelectedLabelIds,
  handleToggleLabel,
  handleEditLabel,
  handleDeleteLabel,
  loadingLabels,
}) {
  return (
    <Card sectioned>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <input
          type="checkbox"
          checked={selectedLabelIds.includes(label.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedLabelIds([...selectedLabelIds, label.id]);
            } else {
              setSelectedLabelIds(
                selectedLabelIds.filter((id) => id !== label.id),
              );
            }
          }}
          style={{ margin: 0 }}
        />

        {/* Label Preview */}
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

        {/* Label Details */}
        <div>
          <div>
            <b>Position</b> {label.position}
          </div>
          <div>
            <b>Condition</b>{" "}
            {label.condition === "rule_based" ? (
              <span style={{ color: "#666" }}>
                {label.ruleType === "special_price"
                  ? "Special Price Rule"
                  : label.ruleType === "new_arrival"
                    ? "New Arrival Rule"
                    : "Rule Based"}
              </span>
            ) : (
              label.condition
            )}
          </div>
          {label.ruleType && label.ruleType !== "specific" && (
            <div>
              <b>Rule:</b>{" "}
              {label.ruleType === "special_price" && label.ruleConfig ? (
                <span style={{ color: "#666" }}>
                  Special Price: ${label.ruleConfig.from || "0"} - $
                  {label.ruleConfig.to || "∞"}
                </span>
              ) : label.ruleType === "new_arrival" && label.ruleConfig ? (
                <span style={{ color: "#666" }}>
                  New Arrival: Last {label.ruleConfig.days || 30} days
                </span>
              ) : (
                <span style={{ color: "#666" }}>{label.ruleType}</span>
              )}
            </div>
          )}
          <div>
            <b>Status:</b>{" "}
            <span
              style={{
                backgroundColor: label.active ? "#00a47c" : "#ccc",
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
          {label.condition === "specific" && label.ruleType === "specific" && (
            <div>
              <b>Products:</b>{" "}
              {Array.isArray(label.productIds) &&
              label.productIds.length > 0 ? (
                <div style={{ marginTop: 4 }}>
                  {label.productIds.map((productId) => (
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
                      {getProductTitleById(products, productId)}
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ color: "#999" }}>No products selected</span>
              )}
            </div>
          )}
          <div style={{ fontSize: 12, color: "#888" }}>
            Created at {formatDate(label.createdAt)}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Button
            size="slim"
            onClick={() => handleToggleLabel(label.id)}
            tone={label.active ? "critical" : "success"}
            loading={loadingLabels.has(label.id)}
            disabled={loadingLabels.has(label.id)}
          >
            {label.active ? "Deactivate" : "Activate"}
          </Button>
          <Button size="slim" onClick={() => handleEditLabel(label)}>
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
  );
}
