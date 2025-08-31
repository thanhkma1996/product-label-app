/**
 * Handle label deletion
 * @param {string} id - Label ID to delete
 * @param {Function} fetcher - Remix fetcher instance
 * @param {Function} setLoadingLabels - Function to set loading state
 */
export function deleteLabel(id, fetcher, setLoadingLabels) {
  setLoadingLabels((prev) => new Set(prev).add(id));
  const formData = new FormData();
  formData.append("_action", "delete");
  formData.append("id", id);
  fetcher.submit(formData, { method: "post" });
}

/**
 * Handle label active status toggle
 * @param {string} id - Label ID to toggle
 * @param {Function} fetcher - Remix fetcher instance
 * @param {Function} setLoadingLabels - Function to set loading state
 */
export function toggleLabel(id, fetcher, setLoadingLabels) {
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
}

/**
 * Handle bulk label activation
 * @param {Array} selectedLabelIds - Array of label IDs to activate
 * @param {Function} fetcher - Remix fetcher instance
 * @param {Function} setBulkActionLoading - Function to set bulk action loading state
 * @param {Function} setSelectedLabelIds - Function to reset selected labels
 */
export function bulkActivateLabels(
  selectedLabelIds,
  fetcher,
  setBulkActionLoading,
  setSelectedLabelIds,
) {
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
}

/**
 * Handle bulk label deactivation
 * @param {Array} selectedLabelIds - Array of label IDs to deactivate
 * @param {Function} fetcher - Remix fetcher instance
 * @param {Function} setBulkActionLoading - Function to set bulk action loading state
 * @param {Function} setSelectedLabelIds - Function to reset selected labels
 */
export function bulkDeactivateLabels(
  selectedLabelIds,
  fetcher,
  setBulkActionLoading,
  setSelectedLabelIds,
) {
  if (selectedLabelIds.length === 0) return;

  try {
    setBulkActionLoading(true);
    const formData = new FormData();
    selectedLabelIds.forEach((id) => {
      formData.append("ids", id);
    });
    fetcher.submit(formData, { method: "post" });
    setSelectedLabelIds([]);
  } catch (error) {
    console.error("Error bulk deactivating labels:", error);
    setBulkActionLoading(false);
  }
}
