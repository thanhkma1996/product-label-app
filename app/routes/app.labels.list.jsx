import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { prisma } from "../prisma.server";
import {
  Page,
  Card,
  TextContainer,
  ResourceList,
  Badge,
} from "@shopify/polaris";

export const loader = async () => {
  const labels = await prisma.label.findMany({
    orderBy: { id: "desc" },
  });
  return json({ labels });
};

export default function LabelsList() {
  const { labels } = useLoaderData();
  return (
    <Page title="Danh sách Label đã tạo">
      <Card>
        <TextContainer>
          <h2 style={{ fontWeight: 600, fontSize: 20, marginBottom: 16 }}>
            Tất cả Label
          </h2>
        </TextContainer>
        <ResourceList
          resourceName={{ singular: "label", plural: "labels" }}
          items={labels}
          renderItem={(label) => {
            return (
              <ResourceList.Item id={label.id}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "8px 0"
                }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      background: label.background,
                      borderRadius: 6,
                      border: "1px solid #eee",
                      display: "inline-block",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{label.text}</div>
                    <div style={{ color: "#666", fontSize: 12 }}>
                      ProductId: {label.productId}
                    </div>
                  </div>
                  <Badge status="info">{label.position}</Badge>
                  <span
                    style={{
                      background: label.background,
                      color: "#fff",
                      padding: "2px 12px",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  >
                    {label.background}
                  </span>
                </div>
              </ResourceList.Item>
            );
          }}
          emptyState={
            <Card sectioned>
              <TextContainer>
                <p>Chưa có label nào được tạo.</p>
              </TextContainer>
            </Card>
          }
        />
      </Card>
    </Page>
  );
} 