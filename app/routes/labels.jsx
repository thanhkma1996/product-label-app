import { useLoaderData, Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { Page, Card, ResourceList, ResourceItem, Thumbnail, Layout } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  // Luôn lấy 50 sản phẩm đầu tiên (có thể tăng số lượng nếu muốn)
  const response = await admin.graphql(`#graphql
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
            featuredImage { url }
          }
        }
      }
    }
  `);
  const data = await response.json();
  const products = data.data.products.edges.map((edge) => edge.node);
  return { products };
};

export default function LabelsProductList() {
  const { products } = useLoaderData();
  return (
    <Page>
      <TitleBar title="Chọn sản phẩm để cấu hình Label" />
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <ResourceList
              resourceName={{ singular: 'sản phẩm', plural: 'sản phẩm' }}
              items={products}
              renderItem={(product) => {
                const media = product.featuredImage?.url ? (
                  <Thumbnail source={product.featuredImage.url} alt={product.title} />
                ) : undefined;
                return (
                  <ResourceItem
                    id={product.id}
                    media={media}
                    accessibilityLabel={`Cấu hình label cho ${product.title}`}
                    persistActions
                  >
                    <h3 style={{ fontWeight: 500, fontSize: 16, margin: 0 }}>
                      <Link to={`/labels/${encodeURIComponent(product.id)}`}>{product.title}</Link>
                    </h3>
                  </ResourceItem>
                );
              }}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 