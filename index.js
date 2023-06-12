const express = require("express");
require('dotenv')
const {
  getProduct,
  createAirtableProduct,
  createSallaProduct,
  createShopifyProduct,
  updateSallaOptionsFromShopify,
  updateVariantsQuantityFromShopify,
  updateAirtableVariantsFromSalla,
  updateShopifyVariantsFromSalla,
  getSallaProduct,
  getSallaAccessToken,
  listShopifyProducts,
  setImageForShopifyProduct
} = require("./controller");
const app = express();
const PORT = process.env.PORT || 5000
const getRawBody = require("raw-body");
const crypto = require("crypto");
const secretKey =
  "7842e04e9a5869a71035cb1c9facd97c0819f97d564ab7b87e2ec5da3a1b758e";

app.use(express.json());

let lastUpdatedSalla;

app.post("/shopify-webhook/add_product", async (req, res) => {
  try {
    const productId = req.header("x-shopify-product-id");
    const product = await getProduct(productId);
    const productNotInAirtable = await createAirtableProduct(product);
    if (productNotInAirtable) {
      createSallaProduct(product);
    }
  } catch (error) {
    console.log(error);
  }

  // Done

  // const hmac = req.get("X-Shopify-Hmac-Sha256");

  // // Use raw-body to get the body (buffer)
  // const body = await getRawBody(req);

  // // Create a hash using the body and our key
  // const hash = crypto
  //   .createHmac("sha256", secretKey)
  //   .update(body, "utf8", "hex")
  //   .digest("base64");
  // // Compare our hash to Shopify's hash
  // if (hash === hmac) {
  //   // It's a match! All good
  //   console.log("Phew, it came from Shopify!");
  //   res.sendStatus(200);
  // } else {
  //   // No match! This request didn't originate from Shopify
  //   console.log("Danger! Not from Shopify!");
  //   res.sendStatus(403);
  // }
});

app.post("/salla-webhook/product_creation", async (req, res) => {
  try {
    if (req.body.event === "product.created") {
      const sallaProduct = await req.body.data;
      console.log(sallaProduct);
      const productNotInAirtable = await createAirtableProduct(sallaProduct);
      if (productNotInAirtable) {
        createShopifyProduct(sallaProduct);
      }
    }
    if (req.body.event === "product.updated") {
      const sallaProduct = await req.body.data;
      if (lastUpdatedSalla) {
        const previousUpdate = new Date(lastUpdatedSalla);
        const newUpdate = new Date(sallaProduct.updated_at);
        const diffTime = Math.abs(newUpdate - previousUpdate);
        const diffInSeconds = diffTime / 1000;
        if (diffInSeconds > 180) {
          updateAirtableVariantsFromSalla(sallaProduct);
          updateShopifyVariantsFromSalla(sallaProduct);
          const productLastSync = await getSallaProduct(sallaProduct.id);
          lastUpdatedSalla = productLastSync.updated_at;
        }
      } else {
        updateAirtableVariantsFromSalla(sallaProduct);
        updateShopifyVariantsFromSalla(sallaProduct);
        const productLastSync = await getSallaProduct(sallaProduct.id);
        lastUpdatedSalla = productLastSync.updated_at;
      }
    }
  } catch (error) {
    console.log(error);
  }

  // Done
});

app.post("/shopify-webhook/update_product", async (req, res) => {
  try {
    const productId = req.header("x-shopify-product-id");
    const product = await getProduct(productId);
    updateVariantsQuantityFromShopify(product);
    updateSallaOptionsFromShopify(product);
  } catch (error) {
    console.log(error);
  }
});

app.post("/salla-webhook/product_update", async (req, res) => {
  try {
    
  } catch (error) {
    console.log(error);
  }
});

app.post("/salla-webhook/order", async (req, res) => {
  if (req.body.event === "order.created") {
    const order = req.body;
    order.items.forEach(async (item, i) => {
      try {
        setTimeout(async () => {
          const sallaProduct = await getSallaProduct(item.id);
          updateAirtableVariantsFromSalla(sallaProduct);
          updateShopifyVariantsFromSalla(sallaProduct);
        }, i * 120);
      } catch (error) {
        console.log(error);
      }
    });
  }
});

app.listen(PORT, async () => {
  console.log("App is running");
});
