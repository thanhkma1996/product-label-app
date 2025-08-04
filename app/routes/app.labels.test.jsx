export const loader = async ({ request }) => {
  return new Response(JSON.stringify({ 
    message: 'Labels API is working!',
    timestamp: new Date().toISOString(),
    url: request.url
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}; 