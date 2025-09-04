import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * Loader function for fetching products and labels
 * @param {Object} request - Request object
 * @returns {Object} Object containing products, shop info, and labels
 */
export const loader = async ({ request }) => {
  const { prisma } = await import("../prisma.server");

  try {
    const { admin, session } = await authenticate.admin(request);
    const shop = session?.shop || "Cửa hàng Shopify";
    const url = new URL(request.url);
    const after = url.searchParams.get("after");
    const search = url.searchParams.get("search") || "";

    // GraphQL query for products
    const query = `#graphql
      query getProducts($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query) {
          edges {
            cursor
            node {
              id
              title
              featuredImage { url }
              createdAt
              variants(first: 1) {
                edges {
                  node {
                    price
                    compareAtPrice
                  }
                }
              }
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

    // Process products data
    const products = data.data.products.edges.map((edge) => ({
      ...edge.node,
      cursor: edge.cursor,
      price: edge.node.variants?.edges?.[0]?.node?.price || "0",
      compareAtPrice:
        edge.node.variants?.edges?.[0]?.node?.compareAtPrice || null,
      createdAt: edge.node.createdAt,
    }));

    const { hasNextPage, endCursor } = data.data.products.pageInfo;

    // Fetch all labels from Prisma
    const labels = await prisma.label.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Debug: Log raw labels data from database
    console.log("LabelServer: Raw labels from database:", labels);
    labels.forEach((label, index) => {
      console.log(`LabelServer: Label ${index + 1} raw data:`, {
        id: label.id,
        text: label.text,
        condition: label.condition,
        ruleType: label.ruleType,
        ruleConfig: label.ruleConfig,
        ruleConfigType: typeof label.ruleConfig,
        active: label.active,
      });
    });

    return { products, shop, hasNextPage, endCursor, labels };
  } catch (error) {
    // If error is due to missing shop domain/session, redirect to login
    return redirect(`/auth/login`);
  }
};

/**
 * Action function for handling label operations
 * @param {Object} request - Request object
 * @returns {Object} Action result
 */
export const action = async ({ request }) => {
  const { prisma } = await import("../prisma.server");

  try {
    const formData = await request.formData();
    const actionType = formData.get("_action");

    // Handle different action types
    switch (actionType) {
      case "delete":
        return await handleDeleteLabel(formData, prisma);

      case "edit":
        return await handleEditLabel(formData, prisma);

      case "toggle":
        return await handleToggleLabel(formData, prisma);

      case "bulkActivate":
        return await handleBulkActivate(formData, prisma);

      case "bulkDeactivate":
        return await handleBulkDeactivate(formData, prisma);

      default:
        return await handleCreateLabel(formData, prisma);
    }
  } catch (error) {
    console.error("Error in label action:", error);
    return { error: "Lỗi khi xử lý label: " + error.message };
  }
};

/**
 * Handle label deletion
 * @param {FormData} formData - Form data
 * @param {Object} prisma - Prisma client
 * @returns {Object} Result object
 */
async function handleDeleteLabel(formData, prisma) {
  const id = formData.get("id");
  await prisma.label.delete({ where: { id } });
  return { success: true, deleted: id };
}

/**
 * Handle label editing
 * @param {FormData} formData - Form data
 * @param {Object} prisma - Prisma client
 * @returns {Object} Result object
 */
async function handleEditLabel(formData, prisma) {
  const id = formData.get("id");
  const text = formData.get("text");
  const background = formData.get("background");
  const position = formData.get("position") || "bottom-center";
  const condition = formData.get("condition");
  const productIds = formData.getAll("productIds");
  const ruleType = formData.get("ruleType");
  const ruleConfig = formData.get("ruleConfig");

  const updated = await prisma.label.update({
    where: { id },
    data: {
      text,
      background,
      position,
      condition,
      productIds: condition === "specific" ? productIds : [],
      ruleType: condition === "specific" ? "specific" : ruleType,
      ruleConfig:
        condition === "specific"
          ? null
          : ruleConfig
            ? JSON.parse(ruleConfig)
            : null,
    },
  });

  return { success: true, updated };
}

/**
 * Handle label active status toggle
 * @param {FormData} formData - Form data
 * @param {Object} prisma - Prisma client
 * @returns {Object} Result object
 */
async function handleToggleLabel(formData, prisma) {
  const id = formData.get("id");
  const currentLabel = await prisma.label.findUnique({ where: { id } });

  const updated = await prisma.label.update({
    where: { id },
    data: { active: !currentLabel.active },
  });

  return { success: true, updated };
}

/**
 * Handle bulk label activation
 * @param {FormData} formData - Form data
 * @param {Object} prisma - Prisma client
 * @returns {Object} Result object
 */
async function handleBulkActivate(formData, prisma) {
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

/**
 * Handle bulk label deactivation
 * @param {FormData} formData - Form data
 * @param {Object} prisma - Prisma client
 * @returns {Object} Result object
 */
async function handleBulkDeactivate(formData, prisma) {
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

/**
 * Handle label creation
 * @param {FormData} formData - Form data
 * @param {Object} prisma - Prisma client
 * @returns {Object} Result object
 */
async function handleCreateLabel(formData, prisma) {
  const text = formData.get("text");
  const background = formData.get("background");
  const position = formData.get("position") || "bottom-center";
  const condition = formData.get("condition");
  const productIds = formData.getAll("productIds");
  const ruleType = formData.get("ruleType");
  const ruleConfig = formData.get("ruleConfig");

  console.log("Action received:", {
    text,
    background,
    position,
    condition,
    productIds,
    ruleType,
    ruleConfig,
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
      ruleType: condition === "specific" ? "specific" : ruleType,
      ruleConfig:
        condition === "specific"
          ? null
          : ruleConfig
            ? JSON.parse(ruleConfig)
            : null,
      active: true, // Default to active
    },
  });

  console.log("Label created successfully:", label);
  return { success: true, label };
}
