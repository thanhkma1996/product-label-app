export const loader = async ({ request }) => {
  try {
    // Import prisma
    const { prisma } = await import('../prisma.server');
    
    // Get all labels
    const labels = await prisma.label.findMany({ 
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        text: true,
        background: true,
        position: true,
        condition: true,
        active: true,
        productIds: true,
        createdAt: true
      }
    });
    
    console.log('App Proxy Labels API: Returning', labels.length, 'labels');
    
    // Return JSON response with CORS headers
    return new Response(JSON.stringify(labels), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error fetching labels via App Proxy:', error);
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
};

// Handle CORS preflight requests
export const action = async ({ request }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  
  return new Response('Method not allowed', { status: 405 });
}; 