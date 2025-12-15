const fetch = require('node-fetch');

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_URL = 'https://api.printful.com';

async function printfulRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${PRINTFUL_API_URL}${endpoint}`, options);

  if (!response.ok) {
    throw new Error(`Printful API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get all products from Printful store
    const productsData = await printfulRequest('/store/products');

    const products = productsData.result.map(product => ({
      id: product.id,
      name: product.name,
      thumbnail: product.thumbnail_url,
      variants: product.variants || [],
    }));

    // Get detailed info for each product including pricing
    const detailedProducts = await Promise.all(
      products.map(async (product) => {
        try {
          const details = await printfulRequest(`/store/products/${product.id}`);
          const syncProduct = details.result.sync_product;
          const syncVariants = details.result.sync_variants;

          // Get the lowest price variant for display
          let lowestPrice = Infinity;
          let highestPrice = 0;

          syncVariants.forEach(variant => {
            const price = parseFloat(variant.retail_price);
            if (price < lowestPrice) lowestPrice = price;
            if (price > highestPrice) highestPrice = price;
          });

          return {
            id: syncProduct.id,
            name: syncProduct.name,
            thumbnail: syncProduct.thumbnail_url,
            description: `Astrology-inspired ${syncProduct.name.toLowerCase()}`,
            priceRange: lowestPrice === highestPrice
              ? `$${lowestPrice.toFixed(2)}`
              : `$${lowestPrice.toFixed(2)} - $${highestPrice.toFixed(2)}`,
            lowestPrice: lowestPrice,
            variants: syncVariants.map(v => ({
              id: v.id,
              name: v.name,
              price: v.retail_price,
              image: v.files?.[0]?.preview_url || syncProduct.thumbnail_url,
            })),
          };
        } catch (error) {
          console.error(`Error fetching product ${product.id}:`, error);
          return null;
        }
      })
    );

    // Filter out any failed products
    const validProducts = detailedProducts.filter(p => p !== null);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
      body: JSON.stringify({ products: validProducts }),
    };

  } catch (error) {
    console.error('Printful sync error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to sync products from Printful' }),
    };
  }
};
