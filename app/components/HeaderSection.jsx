import React from "react";
import { TextContainer, Button, Select, Text } from "@shopify/polaris";
import { LABEL_FILTER_OPTIONS } from "../utils/constants.js";

export default function HeaderSection({
  shop,
  labels,
  labelFilter,
  setLabelFilter,
  openCreateLabelModal,
}) {
  return (
    <>
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
              options={LABEL_FILTER_OPTIONS}
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
    </>
  );
}
