// export const loader = async ({ request }) => {
//   try {
//     // Basic validation - check if request comes from a Shopify store
//     const url = new URL(request.url);
//     const referer = request.headers.get("referer");
//     const origin = request.headers.get("origin");
//     const shopifyProxySignature = request.headers.get(
//       "x-shopify-proxy-signature",
//     );

//     // Allow requests from Shopify stores, App Proxy, or local development
//     const isShopifyRequest =
//       (referer &&
//         (referer.includes(".myshopify.com") ||
//           referer.includes("localhost") ||
//           referer.includes("127.0.0.1"))) ||
//       shopifyProxySignature; // App Proxy requests

//     // Set CORS headers for all responses
//     const corsHeaders = {
//       "Content-Type": "application/json",
//       "Access-Control-Allow-Origin": origin || "*",
//       "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//       "Access-Control-Allow-Headers": "Content-Type, Authorization",
//       "Access-Control-Allow-Credentials": "true",
//     };

//     if (!isShopifyRequest) {
//       console.log("Blocked request from:", referer);
//       return new Response(JSON.stringify({ error: "Unauthorized" }), {
//         status: 403,
//         headers: corsHeaders,
//       });
//     }

//     // Import prisma
//     const { prisma } = await import("../prisma.server");

//     // Get all labels
//     const labels = await prisma.label.findMany({
//       orderBy: { createdAt: "desc" },
//       select: {
//         id: true,
//         text: true,
//         background: true,
//         position: true,
//         condition: true,
//         productIds: true,
//         active: true,
//         createdAt: true,
//       },
//     });

//     console.log("Labels API: Returning", labels.length, "labels");

//     // Return JSON response
//     return new Response(JSON.stringify(labels), {
//       headers: corsHeaders,
//     });
//   } catch (error) {
//     console.error("Error fetching labels:", error);
//     return new Response(JSON.stringify([]), {
//       status: 500,
//       headers: {
//         "Content-Type": "application/json",
//         "Access-Control-Allow-Origin": "*",
//         "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//         "Access-Control-Allow-Headers": "Content-Type, Authorization",
//         "Access-Control-Allow-Credentials": "true",
//       },
//     });
//   }
// };

// // Handle CORS preflight requests
// export const action = async ({ request }) => {
//   const origin = request.headers.get("origin");

//   if (request.method === "OPTIONS") {
//     return new Response(null, {
//       status: 200,
//       headers: {
//         "Access-Control-Allow-Origin": origin || "*",
//         "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//         "Access-Control-Allow-Headers": "Content-Type, Authorization",
//         "Access-Control-Allow-Credentials": "true",
//       },
//     });
//   }

//   return new Response("Method not allowed", { status: 405 });
// };
