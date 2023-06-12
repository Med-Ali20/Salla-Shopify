const axios = require("axios");

// Airtable Data

const airTableToken =
  "pat5mS6XgpuzRhRvt.dc56aa1a13a78ed713ec4c2acc9c981f8703422da00132244e565642ab3b3a74";
const baseId = "app6nnBuaIyRFoYap";
const variantTableId = "tblZ4utiG0PwiTghZ";
const productTableId = "tbls9gIfcrHpiQmOY";
// Shopify Data

const shopifyAccessToken = "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";
const shopifyBaseURI = "https://smokvape1.myshopify.com";
const shopifyLocationId = "43343380615";

// Salla Data

const sallaAuthCode = "";
let sallaRefreshToken = "";
let sallaAccessToken =
  "ory_at_2aZHynsTgVvRhYLUpgbL1LwhDbxjeHwVsOi52EDwV8g.JFapwNo0RNS1yM7c47321xuQbvgl6qZjsBBdBrkAP40";

// Airtable functions

const createAirtableRecord = async (fields, tableId) => {
  try {
    const res = await axios.post(
      `https://api.airtable.com/v0/${baseId}/${tableId}`,
      {
        fields,
        typecast: true,
      },
      {
        headers: {
          Authorization: `Bearer ${airTableToken}`,
        },
      }
    );
    return res.data;
  } catch (error) {
    console.log(error);
  }
};

const updateAirtableRecord = async (fields, tableId, recordId) => {
  try {
    const res = await axios.patch(
      `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`,
      { fields, typecast: true },
      {
        headers: {
          Authorization: `Bearer ${airTableToken}`,
        },
      }
    );
  } catch (error) {
    console.log(error);
  }
};

const getAirtableRecords = async (tableId, offset) => {
  try {
    const res = await axios.get(
      `https://api.airtable.com/v0/${baseId}/${tableId}`,
      {
        headers: {
          Authorization: `Bearer ${airTableToken}`,
        },
        params: {
          offset: offset ? offset : null,
        },
      }
    );
    return res.data;
  } catch (error) {
    console.log(error);
  }
};

const createAirtableProduct = async (product) => {
  try {
    const airtableProductRequestBody = product.title
      ? {
          Name: product.title,
          "Shopify ID": product.id.toString(),
          "Option Name1": product.options[0].name
            ? product.options[0].name
            : null,
        }
      : {
          Name: product.name,
          "SALLA Product ID": product.id.toString(),
          "Option Name1":
            product.options.length > 0 ? product.options[0].name : null,
        };
    const products = await getAirtableProducts();
    const identicalProduct = products.filter((product) => {
      return product.fields.Name == airtableProductRequestBody["Name"];
    });
    if (identicalProduct.length == 0) {
      const res = await createAirtableRecord(
        airtableProductRequestBody,
        productTableId
      );
      if (res.id) {
        const productId = res.id;
        if (product.title) {
          createAirtableVariants(product.variants, productId, product.title);
        } else if (product.name && product.variants) {
          createVariantsFromSalla(product, productId);
        }
      }
      return true;
    } else {
      console.log("Product already exists");
      return false;
    }
  } catch (error) {
    console.log(error);
  }
};

const createAirtableVariants = async (variants, productId, productTitle) => {
  try {
    const airtableVariants = await getAirtableVariants();
    variants.forEach((variant, i) => {
      const requestBody = {
        Handle: productTitle,
        Title: productTitle,
        Product: productId,
        "Variant SKU - Shopify": variant.sku ? variant.sku : null,
        "Option1 Value": variant.option1,
        "Variant Inventory Qty": variant.inventory_quantity,
      };
      const identicalVariant = airtableVariants.filter((variant) => {
        return (
          variant.fields["Variant SKU - Shopify"] == requestBody["Variant SKU - Shopify"]
        );
      });
      if (identicalVariant.length > 0) {
        return;
      }
      setTimeout(() => {
        createAirtableRecord(requestBody, variantTableId);
      }, i * 150);
    });
    console.log("variants created");
  } catch (error) {
    console.log(error);
  }
};

async function getAirtableProducts() {
  let offset;
  let products = []; // An array to hold all the data

  while (true) {
    // Keep looping until all the data is fetched
    await new Promise((resolve) => setTimeout(resolve, 200)); // Add a delay of 300ms

    const response = await getAirtableRecords(productTableId, offset);
    const records = response.records;
    products = products.concat(records); // Add the data to the array

    if (!response.offset) {
      // No more data to fetch, exit loop
      break;
    }

    offset = response.offset; // Move to the next page
  }
  return products; // Return all the fetched data
}

async function getAirtableVariants() {
  let offset;
  let variants = []; // An array to hold all the data

  while (true) {
    // Keep looping until all the data is fetched
    await new Promise((resolve) => setTimeout(resolve, 200)); // Add a delay of 300ms

    const response = await getAirtableRecords(variantTableId, offset);
    const records = response.records;
    variants = variants.concat(records); // Add the data to the array

    if (!response.offset) {
      // No more data to fetch, exit loop
      break;
    }

    offset = response.offset; // Move to the next page
  }
  return variants; // Return all the fetched data
}

// Shopify Functions

const getProduct = async (id) => {
  try {
    const res = await axios.get(
      `${shopifyBaseURI}/admin/api/2023-04/products/${id}.json`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": shopifyAccessToken,
        },
      }
    );
    const product = res.data.product;
    return product;
  } catch (error) {
    error;
  }
};

// Salla Functions

const getSallaAccessToken = async () => {
  try {
    const res = await axios.post(
      "https://accounts.salla.sa/oauth2/token",
      {
        client_id: "8fa151ee-e894-4ee7-8966-589c87cf6cd3",
        client_secret: "11db7f6347094041674d00a7bed84359",
        grant_type: "authorization_code",
        code: "ory_ac_PLoDlxlaf3b_4_12EusecuqTLSNEU-XhkMfT3JozLTg.VCXfaZNzgw7dTKaiD0bB9vjmkTTITQa0d76HkWtb9xQ",
        scope: "offline_access",
        redirect_uri: "https://geekyair.com",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    sallaRefreshToken = res.data.refresh_token;
    sallaAccessToken = res.data.access_token;
    console.log(res);
  } catch (error) {
    console.log(error);
  }
};

const createSallaProduct = async (product) => {
  // Change the price and quantity maping and make it done by reducer.

  try {
    let sumPrices = 0;
    let sumQuantity = 0;
    product.variants.forEach((variant) => {
      sumPrices = sumPrices + parseInt(variant.price);
      sumQuantity = sumQuantity + parseInt(variant.inventory_quantity);
    });
    const price = sumPrices / product.variants.length;
    const options = product.options.map((option, i) => {
      return {
        name: `${option.name}`,
        display_type: "text",
        values: option.values.map((value, index) => {
          return {
            name: value,
            price: parseInt(product.variants[index].price),
            quantity: parseInt(product.variants[index].inventory_quantity),
          };
        }),
      };
    });

    const requestBody = {
      name: product.title,
      price,
      status: product.status === "active" ? "sale" : "out",
      product_type: "product",
      quantity: sumQuantity,
      options,
      // images: product.image.src ?  [
      //   {
      //     original: product.image.src ? product.image.src : '',
      //     thumbnail: product.image.src ? product.image.src : '',
      //     default: product.image.src ? true : false,
      //     sort: 1,
      //     alt: product.title
      //   },
      // ] : null,
    };
    const res = await axios.post(
      "https://api.salla.dev/admin/v2/products",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${sallaAccessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    const sallaOptions = res.data.data.options;
    const optionName = sallaOptions[0].name;
    const values = sallaOptions[0].values;
    console.log(optionName);
    console.log(values);
    console.log("Product Created in Salla!");
  } catch (error) {
    console.log(error);
  }
};

const listSallaProducts = async () => {
  try {
    let page = 1;
    let products = []; // An array to hold all the data

    while (true) {
      // Keep looping until all the data is fetched
      await new Promise((resolve) => setTimeout(resolve, 100)); // Add a delay of 300ms

      const res = await axios.get("https://api.salla.dev/admin/v2/products", {
        headers: {
          Authorization: `Bearer ${sallaAccessToken}`,
          "Content-Type": "application/json",
        },
        params: {
          page,
          per_page: 65,
        },
      });
      console.log(res.data.pagination);
      products.push(...res.data.data);

      if (res.data.pagination.currentPage === res.data.pagination.totalPages) {
        // No more data to fetch, exit loop
        break;
      }
      page++; // Move to the next page
    }
    return products;
  } catch (error) {
    console.log(error);
  }
};

const getSallaProduct = async (id) => {
  try {
    const res = await axios.get(
      `https://api.salla.dev/admin/v2/products/${id}`,
      {
        headers: {
          Authorization: `Bearer ${sallaAccessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(res.data);
    const sallaProduct = res.data;
    return sallaProduct;
  } catch (error) {
    console.log(error);
  }
};

const createVariantsFromSalla = async (product, productId) => {
  try {
    const airtableVariants = await getAirtableVariants();

    product.skus.forEach((sku, i) => {
      const requestBody = {
        Handle: product.name,
        Title: product.name,
        Product: productId ? productId : null,
        "Variant SALLA ID": sku.id,
        "Option1 Value": product.options[0].values[i].name,
        "Variant Inventory Qty": sku.stock_quantity,
      };
      const identicalVariant = airtableVariants.filter((variant) => {
        return (
          variant.fields["Variant SALLA ID"] == requestBody["Variant SALLA ID"]
        );
      });
      if (identicalVariant.length > 0) {
        return;
      }
      setTimeout(async () => {
        const res = await createAirtableRecord(requestBody, variantTableId);
        console.log(res);
      }, i * 150);
    });
    console.log("variants created");
  } catch (error) {
    console.log(error);
  }
};

// Shopify Functions

const createShopifyProduct = async (sallaProduct) => {
  try {
    const variants =
      sallaProduct.options.length > 0
        ? sallaProduct.options[0].skus.map((sku, i) => {
            let variant = {
              sku: sku.id,
              inventory_quantity: sku.stock_quantity,
            };
            variant[`${sallaProduct.options[0].name}`] =
              sallaProduct.options[0].values[i];
            return variant;
          })
        : null;
    const requestBody = {
      product: {
        title: sallaProduct.name,
        vendor: "فيب سموك",
        product_type: sallaProduct.type,
        variants,
      },
    };
    const res = await axios.post(
      `${shopifyBaseURI}/admin/api/2023-04/products.json`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": shopifyAccessToken,
        },
      }
    );
  } catch (error) {
    console.log(error);
  }
};

const updateVariantsQuantityFromShopify = async (product) => {
  try {
    const airtableVariants = await getAirtableVariants();
    const skus = product.variants.map((variant) => {
      return variant.sku;
    });
    const variantsNeedUpdate = airtableVariants.filter((variant) =>
      skus.includes(variant.fields["Variant SKU - Shopify"])
    );

    product.variants.forEach(async (productVariant) => {
      try {
        const airtableVariant = variantsNeedUpdate.filter((airtableVariant) => {
          return (
            airtableVariant.fields["Variant SKU - Shopify"] ===
            productVariant.sku
          );
        })[0];
        const requestBody = {
          "Variant Inventory Qty": productVariant.stock_quantity,
        };
        const res = await updateAirtableRecord(
          requestBody,
          variantTableId,
          airtableVariant.id
        );
        console.log(res);
      } catch (error) {
        console.log(error);
      }
    });
  } catch (error) {
    console.log(error);
  }
};

const updateSallaOptionsFromShopify = async (product) => {
  try {
    const sallaProducts = await listSallaProducts();
    const needsUpdate = sallaProducts.filter((sProduct) => {
      return sProduct.name === product.title;
    })[0];

    if (needsUpdate && product.variants.length > 0) {
      const variants = product.variants.map((variant, i) => {
        return {
          sku: variant.sku,
          price: variant.price,
          stock_quantity: variant.inventory_quantity,
        };
      });

      variants.forEach(async (variant, i) => {
        setTimeout(() => {
          try {
            const sallaVariantToUpdate = needsUpdate.skus.filter(
              (sku) => sku.id === variant.sku
            )[0];
            const res = axios.put(
              `https://api.salla.dev/admin/v2/products/variants/${sallaVariantToUpdate.id}`,
              {
                variant,
              },
              {
                headers: {
                  Authorization: `Bearer ${sallaAccessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );
          } catch (error) {
            console.log(error);
          }
        }, i * 120);
      });
    }

    updateSallaProduct(product, needsUpdate.id);
  } catch (error) {
    console.log(error);
  }
};

const updateSallaProduct = async (product, sallaProductId) => {
  try {
    let sumQuantity = 0;
    product.variants.forEach((variant) => {
      sumQuantity = sumQuantity + parseInt(variant.inventory_quantity);
    });
    const res = await axios.put(
      `https://api.salla.dev/admin/v2/products/quantities/${sallaProductId}`,
      {
        quantity: sumQuantity,
      },
      {
        headers: {
          Authorization: `Bearer ${sallaAccessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.log(error);
  }
};

const updateAirtableVariantsFromSalla = async (product) => {
  try {
    const airtableVariants = await getAirtableVariants();
    if (product.skus.length > 0) {
      const skus = product.skus.map((sku) => sku.id.toString());
      const variantsNeedUpdate = airtableVariants.filter((variant) => {
        return skus.includes(variant.fields["Variant SALLA ID"]);
      });
      if (variantsNeedUpdate.length > 0) {
        product.skus.forEach(async (sku) => {
          try {
            const airtableVariant = variantsNeedUpdate.filter(
              (airtableVariant) => {
                return (
                  airtableVariant.fields["Variant SALLA ID"] ===
                  sku.id.toString()
                );
              }
            )[0];
            const requestBody = {
              "Variant Inventory Qty": sku.stock_quantity,
            };
            const res = await updateAirtableRecord(
              requestBody,
              variantTableId,
              airtableVariant.id
            );
            console.log(res);
          } catch (error) {
            console.log(error);
          }
        });
      } else {
        createVariantsFromSalla(product);
      }
    }
  } catch (error) {
    console.log(error);
  }
};

const updateShopifyVariantsFromSalla = async (sallaProduct) => {
  try {
    const variants =
      sallaProduct.options.length > 0
        ? sallaProduct.skus.map((sku, i) => {
            let variant = {
              sku: sku.id,
              inventory_quantity: sku.stock_quantity,
              price: sku.price.amount,
            };
            variant[`option1`] = sallaProduct.options[0].values[i].name;
            return variant;
          })
        : null;

    console.log("Variants ll", variants);

    // getSopifyProducts here
    const products = await listShopifyProducts();
    const shopifyProductToUpdate = products.find(
      (product) => product.title === sallaProduct.name
    );
    console.log("Shopify Product To Update", shopifyProductToUpdate);
    console.log("Salla Product", sallaProduct);
    if (shopifyProductToUpdate) {
      variants.forEach(async (sallaVariant) => {
        const shopifyVariantToUpdate = shopifyProductToUpdate.variants.find(
          (shopifyVariant) => {
            return sallaVariant.sku == shopifyVariant.sku;
          }
        );
        console.log("Shopify Variant To Update", shopifyVariantToUpdate);
        if (shopifyVariantToUpdate) {
          const variantInventoryId = shopifyVariantToUpdate.inventory_item_id;

          updateShopifyVariantQuantity(
            variantInventoryId,
            sallaVariant.inventory_quantity
          );
        } else {
          const variantToCreate = { ...sallaVariant };
          delete variantToCreate.inventory_quantity;
          const res = await createShopifyVariantFromSalla(
            variantToCreate,
            shopifyProductToUpdate.id
          );
          try {
            const variantInventoryId = await res.data.variant.inventory_item_id;

            updateShopifyVariantQuantity(
              variantInventoryId,
              sallaVariant.inventory_quantity
            );
          } catch (error) {
            console.log(error);
          }
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
};

const updateShopifyVariantQuantity = async (inventoryId, adjustment) => {
  try {
    const res = await axios.post(
      `${shopifyBaseURI}/admin/api/2023-04/inventory_levels/set.json`,
      {
        location_id: shopifyLocationId,
        inventory_item_id: inventoryId,
        available: adjustment,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": shopifyAccessToken,
        },
      }
    );
    console.log(res);
  } catch (error) {
    console.log(error);
  }
};
const listShopifyProducts = async () => {
  try {
    let lastId;
    let products = []; // An array to hold all the data

    while (true) {
      // Keep looping until all the data is fetched
      await new Promise((resolve) => setTimeout(resolve, 100)); // Add a delay of 300ms

      const res = await axios.get(
        `${shopifyBaseURI}/admin/api/2023-04/products.json?`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": shopifyAccessToken,
          },
          params: {
            limit: 250,
            direction: "next",
            last_id: lastId ? lastId : null,
            order: "id",
          },
        }
      );
      products.push(...res.data.products);

      if (res.data.products.length == 0) {
        // No more data to fetch, exit loop
        break;
      }
      lastId = res.data.products[res.data.products.length - 1].id; // Move to the next page
    }
    console.log("Products length", products.length);
    return products;
  } catch (error) {
    console.log(error);
  }
};

// create shopify variants

const createShopifyVariantFromSalla = async (
  sallaVariant,
  shopifyProductId
) => {
  try {
    const res = await axios.post(
      `${shopifyBaseURI}/admin/api/2023-04/products/${shopifyProductId}/variants.json`,
      {
        variant: sallaVariant,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": shopifyAccessToken,
        },
      }
    );
    console.log(res);
    return res;
  } catch (error) {
    console.log(error);
  }
};

const setImageForShopifyProduct = async (sallaProduct) => {
  try {
    const productId = sallaProduct.id;
    axios.post(
      `${shopifyBaseURI}/admin/api/2023-04/products/${productId}/images.json`,
      {
        image: {
          src: sallaProduct.image[0].url,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": shopifyAccessToken,
        },
      }
    );
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  getProduct,
  createAirtableProduct,
  createSallaProduct,
  getSallaAccessToken,
  getSallaProduct,
  createShopifyProduct,
  getAirtableVariants,
  listSallaProducts,
  updateSallaOptionsFromShopify,
  updateVariantsQuantityFromShopify,
  updateAirtableVariantsFromSalla,
  updateShopifyVariantsFromSalla,
  listShopifyProducts,
  setImageForShopifyProduct,
};
