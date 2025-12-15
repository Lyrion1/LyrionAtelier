const fetch = require('node-fetch');

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_URL = 'https://api.printful.com';

async function printfulRequest(endpoint) {
  const response = await fetch(`${PRINTFUL_API_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

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
    // Get all store products
    const productsData = await printfulRequest('/store/products');

    // Get detailed info for each product
    const detailedProducts = await Promise.all(
      productsData.result.map(async (product) => {
        try {
          const details = await printfulRequest(`/store/products/${product.id}`);
          const syncProduct = details.result.sync_product;
          const syncVariants = details.result.sync_variants;

          // Group variants by size and color
          const sizesSet = new Set();
          const colorsSet = new Set();

          syncVariants.forEach(variant => {
            if (variant.size) sizesSet.add(variant.size);
            if (variant.color) colorsSet.add(variant.color);
          });

          // Get price range
          const prices = syncVariants.map(v => parseFloat(v.retail_price));
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const sizeOrder = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
          const getSizeIndex = (size) => {
            const idx = sizeOrder.indexOf(size);
            return idx === -1 ? sizeOrder.length : idx;
          };

          return {
            id: syncProduct.id,
            name: syncProduct.name,
            thumbnail: syncProduct.thumbnail_url,
            description: `Astrology-inspired ${syncProduct.name.toLowerCase()}`,
            priceRange: minPrice === maxPrice
              ? `$${minPrice.toFixed(2)}`
              : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`,
            sizes: Array.from(sizesSet).sort((a, b) => getSizeIndex(a) - getSizeIndex(b)),
            colors: Array.from(colorsSet),
            variants: syncVariants.map(v => ({
              id: v.id,
              variant_id: v.variant_id || null,
              name: v.name,
              size: v.size || 'One Size',
              color: v.color || 'Default',
              price: parseFloat(v.retail_price),
              // Prefer available preview files (mockups often appear later), fallback to product thumbnail
              image: v.files?.[1]?.preview_url || v.files?.[0]?.preview_url || syncProduct.thumbnail_url,
              inStock: v.availability_status !== 'out_of_stock',
            })),
          };
        } catch (error) {
          console.error(`Error fetching product ${product.id}:`, error);
          return null;
        }
      })
    );

    const validProducts = detailedProducts.filter(p => p !== null);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600',
      },
      body: JSON.stringify({ products: validProducts }),
    };

  } catch (error) {
    console.error('Printful sync error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to sync products' }),
    };
  }
};
