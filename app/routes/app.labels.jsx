import {
  useLoaderData,
  useActionData,
  useNavigation,
  useFetcher,
} from "@remix-run/react";

import { Page, Layout } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useEffect } from "react";

// Import utility functions
import { hexFromRgb, hexToRgb } from "../utils/colorUtils.js";
import {
  deleteLabel,
  toggleLabel,
  bulkActivateLabels,
  bulkDeactivateLabels,
} from "../utils/labelActions.js";
import {
  resetLabelFormState,
  setEditLabelState,
  resetLoadingStates,
} from "../utils/stateUtils.js";
import { submitLabelForm } from "../utils/formSubmission.js";
import { DEFAULT_LABEL_VALUES } from "../utils/constants.js";

// Import components
import HeaderSection from "../components/HeaderSection.jsx";
import LabelList from "../components/LabelList.jsx";
import LabelModal from "../components/LabelModal.jsx";

// Import server-side logic
export { loader, action } from "../server/labelServer.js";

export default function LabelsProductList() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const products = loaderData.products;
  const [modalActive, setModalActive] = useState(false);
  const [labelText, setLabelText] = useState("");
  const [labelBg, setLabelBg] = useState(DEFAULT_LABEL_VALUES.background);
  const [labelHex, setLabelHex] = useState(
    hexFromRgb(DEFAULT_LABEL_VALUES.background),
  );
  const [labelPosition, setLabelPosition] = useState(
    DEFAULT_LABEL_VALUES.position,
  );
  const [activeTab, setActiveTab] = useState(0);
  const [productCondition, setProductCondition] = useState(
    DEFAULT_LABEL_VALUES.productCondition,
  );
  const [selectedProductIds, setSelectedProductIds] = useState(
    DEFAULT_LABEL_VALUES.selectedProductIds,
  );
  const [editLabel, setEditLabel] = useState(null); // label đang chỉnh sửa
  const [labelFilter, setLabelFilter] = useState("all"); // "all", "active", "inactive"
  const [selectedLabelIds, setSelectedLabelIds] = useState([]); // For bulk actions
  const [loadingLabels, setLoadingLabels] = useState(new Set()); // Track loading state for individual labels
  const [bulkActionLoading, setBulkActionLoading] = useState(false); // Track bulk action loading
  const [productSearchTerm, setProductSearchTerm] = useState(""); // For product search
  const [debouncedProductSearch, setDebouncedProductSearch] = useState(""); // Debounced search term

  // New rule type states
  const [ruleType, setRuleType] = useState(DEFAULT_LABEL_VALUES.ruleType);
  const [specialPriceFrom, setSpecialPriceFrom] = useState(
    DEFAULT_LABEL_VALUES.specialPriceFrom,
  );
  const [specialPriceTo, setSpecialPriceTo] = useState(
    DEFAULT_LABEL_VALUES.specialPriceTo,
  );
  const [newArrivalDays, setNewArrivalDays] = useState(
    DEFAULT_LABEL_VALUES.newArrivalDays,
  );

  const shop = loaderData.shop;
  const isSubmitting =
    navigation.state === "submitting" || fetcher.state === "submitting";
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
      resetLabelFormState(
        setLabelText,
        setLabelBg,
        setLabelHex,
        setLabelPosition,
        setActiveTab,
        setProductCondition,
        setSelectedProductIds,
        setEditLabel,
        setProductSearchTerm,
        setDebouncedProductSearch,
        setRuleType,
        setSpecialPriceFrom,
        setSpecialPriceTo,
        setNewArrivalDays,
      );
      setSelectedLabelIds([]); // Reset selected labels on success

      // Reset all loading states on success
      resetLoadingStates(setLoadingLabels, setBulkActionLoading);
    }

    // Handle errors
    if (actionData?.error) {
      console.error("Action error:", actionData.error);
      // Reset loading states on error
      resetLoadingStates(setLoadingLabels, setBulkActionLoading);
    }
  }, [actionData]);

  // Handle fetcher success/error for modal actions
  useEffect(() => {
    if (fetcher.data?.success) {
      setModalActive(false);
      resetLabelFormState(
        setLabelText,
        setLabelBg,
        setLabelHex,
        setLabelPosition,
        setActiveTab,
        setProductCondition,
        setSelectedProductIds,
        setEditLabel,
        setProductSearchTerm,
        setDebouncedProductSearch,
        setRuleType,
        setSpecialPriceFrom,
        setSpecialPriceTo,
        setNewArrivalDays,
      );
      setSelectedLabelIds([]); // Reset selected labels on success

      // Reset all loading states on success
      resetLoadingStates(setLoadingLabels, setBulkActionLoading);
    }

    // Handle fetcher errors
    if (fetcher.data?.error) {
      console.error("Fetcher error:", fetcher.data.error);
      // Reset loading states on error
      resetLoadingStates(setLoadingLabels, setBulkActionLoading);
    }
  }, [fetcher.data]);

  // Reset loading states when fetcher state changes
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      // Reset loading states when fetcher completes
      resetLoadingStates(setLoadingLabels, setBulkActionLoading);
    }
  }, [fetcher.state, fetcher.data]);

  // Debug: Track labelBg changes
  useEffect(() => {
    console.log("labelBg state changed:", labelBg);
  }, [labelBg]);

  // Khi submit chỉnh sửa label
  const handleEditLabel = (label) => {
    setEditLabelState(
      label,
      setEditLabel,
      setLabelText,
      setLabelBg,
      setLabelHex,
      setLabelPosition,
      setProductCondition,
      setRuleType,
      setSelectedProductIds,
      setSpecialPriceFrom,
      setSpecialPriceTo,
      setNewArrivalDays,
      setModalActive,
      hexToRgb,
    );
  };
  // Khi submit xóa label
  const handleDeleteLabel = (id) => {
    deleteLabel(id, fetcher, setLoadingLabels);
  };

  // Khi toggle active status
  const handleToggleLabel = (id) => {
    toggleLabel(id, fetcher, setLoadingLabels);
  };
  // Bulk activate labels
  const handleBulkActivate = () => {
    bulkActivateLabels(
      selectedLabelIds,
      fetcher,
      setBulkActionLoading,
      setSelectedLabelIds,
    );
  };

  // Bulk deactivate labels
  const handleBulkDeactivate = () => {
    bulkDeactivateLabels(
      selectedLabelIds,
      fetcher,
      setBulkActionLoading,
      setSelectedLabelIds,
    );
  };
  // Khi lưu label (tạo hoặc chỉnh sửa)
  const handleSaveLabel = async () => {
    const formData = {
      labelText,
      labelBg: hexFromRgb(labelBg),
      labelPosition,
      productCondition,
      ruleType,
      selectedProductIds,
      specialPriceFrom,
      specialPriceTo,
      newArrivalDays,
    };

    const editLabelId = editLabel ? editLabel.id : null;
    submitLabelForm(formData, editLabelId, fetcher);
    // Modal sẽ tự động đóng khi fetcher.data.success được set
  };
  // Reset edit state khi đóng modal
  const closeCreateLabelModal = () => {
    setModalActive(false);
    resetLabelFormState(
      setLabelText,
      setLabelBg,
      setLabelHex,
      setLabelPosition,
      setActiveTab,
      setProductCondition,
      setSelectedProductIds,
      setEditLabel,
      setProductSearchTerm,
      setDebouncedProductSearch,
      setRuleType,
      setSpecialPriceFrom,
      setSpecialPriceTo,
      setNewArrivalDays,
    );
  };
  // Modal logic
  const openCreateLabelModal = () => {
    setEditLabel(null); // Đảm bảo là tạo mới, không phải edit
    resetLabelFormState(
      setLabelText,
      setLabelBg,
      setLabelHex,
      setLabelPosition,
      setActiveTab,
      setProductCondition,
      setSelectedProductIds,
      setEditLabel,
      setProductSearchTerm,
      setDebouncedProductSearch,
      setRuleType,
      setSpecialPriceFrom,
      setSpecialPriceTo,
      setNewArrivalDays,
    );
    setModalActive(true);
  };

  return (
    <Page>
      <TitleBar title="DO Product Label" />
      <Layout>
        <Layout.Section>
          <HeaderSection
            shop={shop}
            labels={labels}
            labelFilter={labelFilter}
            setLabelFilter={setLabelFilter}
            openCreateLabelModal={openCreateLabelModal}
          />
          {/* Label List Component */}
          <LabelList
            filteredLabels={filteredLabels}
            labels={labels}
            products={products}
            selectedLabelIds={selectedLabelIds}
            setSelectedLabelIds={setSelectedLabelIds}
            handleToggleLabel={handleToggleLabel}
            handleEditLabel={handleEditLabel}
            handleDeleteLabel={handleDeleteLabel}
            loadingLabels={loadingLabels}
            bulkActionLoading={bulkActionLoading}
            handleBulkActivate={handleBulkActivate}
            handleBulkDeactivate={handleBulkDeactivate}
          />
        </Layout.Section>
      </Layout>

      {/* Label Modal Component */}
      <LabelModal
        modalActive={modalActive}
        onClose={closeCreateLabelModal}
        onSave={handleSaveLabel}
        isSubmitting={isSubmitting}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        labelText={labelText}
        setLabelText={setLabelText}
        labelBg={labelBg}
        setLabelBg={setLabelBg}
        labelHex={labelHex}
        setLabelHex={setLabelHex}
        labelPosition={labelPosition}
        setLabelPosition={setLabelPosition}
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
        editLabel={editLabel}
      />
    </Page>
  );
}

export const headers = () => ({
  "Content-Type": "application/json",
});

export const unstable_shouldReload = () => false;
