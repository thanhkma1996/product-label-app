export const loader = async ({ request }) => {
  const origin = request.headers.get('origin');
  
  return new Response(JSON.stringify({ 
    message: 'Labels API is working!',
    timestamp: new Date().toISOString(),
    url: request.url,
    origin: origin,
    cors: 'enabled'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
};

// Handle CORS preflight requests
export const action = async ({ request }) => {
  const origin = request.headers.get('origin');
  
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }
  
  return new Response('Method not allowed', { status: 405 });
}; 