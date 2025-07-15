// app/routes/api/products.tsx or .ts
import { json, LoaderFunctionArgs } from '@remix-run/node';
import { authenticate } from 'app/shopify.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const query = `
    query GetProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            vendor
            productType
            createdAt
            updatedAt
            status
            totalInventory
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  sku
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
            images(first: 1) {
              edges {
                node {
                  originalSrc
                  altText
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    first: 50,
  };

  const response = await admin.graphql(query, { variables });
  const result = await response.json();

  return json(result);
};
