import { useLoaderData, useNavigate, useParams } from "@remix-run/react";
import { json } from "@remix-run/node";
import { useState } from "react";
import { authenticate } from "../../shopify.server";

// GraphQL query lấy label theo productId
const LABEL_QUERY = `query($productId: String!) {
  labels(productId: $productId) {
    id
    text
    background
    position
    productId
    createdAt
    updatedAt
  }
}`;

// GraphQL mutation tạo/cập nhật label
const CREATE_LABEL_MUTATION = `mutation($productId: String!, $text: String!, $background: String!, $position: String!) {
  createLabel(productId: $productId, text: $text, background: $background, position: $position) {
    id
    text
    background
    position
    productId
    createdAt
    updatedAt
  }
}`;
const UPDATE_LABEL_MUTATION = `mutation($id: ID!, $text: String, $background: String, $position: String) {
  updateLabel(id: $id, text: $text, background: $background, position: $position) {
    id
    text
    background
    position
    productId
    createdAt
    updatedAt
  }
}`;

export const loader = async ({ params, request }) => {
  await authenticate.admin(request);
  const productId = params.productId;
  // Gọi API GraphQL nội bộ để lấy label
  const res = await fetch(`${process.env.SHOPIFY_APP_URL || "http://localhost:3000"}/api/label`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: LABEL_QUERY,
      variables: { productId },
    }),
  });
  const data = await res.json();
  const label = data.data.labels[0] || null;
  return json({ label, productId });
};

export default function LabelConfigPage() {
  const { label, productId } = useLoaderData();
  const [text, setText] = useState(label?.text || "");
  const [background, setBackground] = useState(label?.background || "#FF0000");
  const [position, setPosition] = useState(label?.position || "top-left");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const mutation = label ? UPDATE_LABEL_MUTATION : CREATE_LABEL_MUTATION;
    const variables = label
      ? { id: label.id, text, background, position }
      : { productId, text, background, position };
    const res = await fetch("/api/label", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: mutation, variables }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.errors) {
      setMessage("Có lỗi xảy ra: " + data.errors[0].message);
    } else {
      setMessage("Lưu label thành công!");
      // Optionally reload or redirect
      // navigate("/labels");
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "40px auto" }}>
      <h2>Cấu hình Label cho sản phẩm</h2>
      {/* Preview label */}
      <div style={{
        position: "relative",
        width: 300,
        height: 120,
        border: "1px dashed #ccc",
        marginBottom: 24,
        background: "#fafbfc",
        borderRadius: 8,
        overflow: "hidden"
      }}>
        <span
          style={{
            position: "absolute",
            ...(position === "top-left" && { top: 12, left: 12 }),
            ...(position === "top-right" && { top: 12, right: 12 }),
            ...(position === "bottom-left" && { bottom: 12, left: 12 }),
            ...(position === "bottom-right" && { bottom: 12, right: 12 }),
            background,
            color: "#fff",
            padding: "6px 18px",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            transition: "all 0.2s"
          }}
        >
          {text || "Label preview"}
        </span>
        <span style={{position: "absolute", bottom: 8, right: 12, fontSize: 12, color: "#bbb"}}>
          Preview
        </span>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label>
          Text:
          <input value={text} onChange={e => setText(e.target.value)} required style={{ width: "100%" }} />
        </label>
        <label>
          Background:
          <input type="color" value={background} onChange={e => setBackground(e.target.value)} style={{ width: 60, height: 32, padding: 0, border: "none" }} />
        </label>
        <label>
          Vị trí:
          <select value={position} onChange={e => setPosition(e.target.value)}>
            <option value="top-left">Trên trái</option>
            <option value="top-right">Trên phải</option>
            <option value="bottom-left">Dưới trái</option>
            <option value="bottom-right">Dưới phải</option>
          </select>
        </label>
        <button type="submit" disabled={saving}>{saving ? "Đang lưu..." : (label ? "Cập nhật" : "Tạo label")}</button>
        {message && <div style={{ color: message.includes("thành công") ? "green" : "red" }}>{message}</div>}
      </form>
    </div>
  );
} 