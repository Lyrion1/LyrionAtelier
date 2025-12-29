const fetch = require("node-fetch");
const fs = require("fs");

async function fetchPrintfulVariants() {
  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

  if (!PRINTFUL_API_KEY) {
    console.error("PRINTFUL_API_KEY environment variable is required");
    process.exit(1);
  }

  try {
    const response = await fetch("https://api.printful.com/store/products", {
      headers: {
        Authorization: `Bearer ${PRINTFUL_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const products = data.result.map((product) => ({
      name: product.name,
      printfulId: product.id,
      variants: product.sync_variants.map((v) => ({
        id: v.id,
        variantId: v.variant_id,
        name: v.name,
        size: v.size,
        color: v.color,
      })),
    }));

    console.log("=== PRINTFUL PRODUCTS ===");
    console.log(JSON.stringify(products, null, 2));

    // Auto-generate product mapping
    const mapping = {
      products: products.map((p) => ({
        name: p.name,
        printfulVariantId: p.variants[0]?.variantId || "",
        type: "physical",
      })),
    };

    fs.writeFileSync(
      "./config/printful-products.json",
      JSON.stringify(mapping, null, 2)
    );

    console.log("\nProduct mapping created at /config/printful-products.json");
  } catch (error) {
    console.error("Error fetching Printful products:", error);
  }
}

fetchPrintfulVariants();
