import { useEffect } from "react";
import { useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  BlockStack,
} from "@shopify/polaris";


export default function Index() {
  const navigate = useNavigate();

  // Auto-redirect to labels page on mount
  useEffect(() => {
    navigate("/app/labels", { replace: true });
  }, [navigate]);


  return (
    <Page>
      <BlockStack gap="500">
        <Layout>
            <Text>DEMO APP PRODUCT LABEL</Text>
        </Layout>
      </BlockStack>
    </Page>
  );
}
