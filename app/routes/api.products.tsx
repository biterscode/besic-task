import { json, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get("search") || "";
    const after = url.searchParams.get("after");
    const before = url.searchParams.get("before");
    const direction = after ? "next" : before ? "prev" : "first";
    const query = searchQuery ? `title:*${searchQuery}*` : undefined;

    const response = await admin.graphql(
      `#graphql
     query FetchProducts($query: String, $first: Int, $last: Int, $after: String, $before: String) {
       products(query:$query, first: $first, last: $last, after: $after, before: $before) {
         edges {
           cursor
           node {
             id
             title
             tags
             status
             featuredImage {
               url
               altText
             }
             variants(first: 1) {
               edges {
                 node {
                   inventoryQuantity
                 }
               }
             }
           }
         }
         pageInfo {
           hasNextPage
           hasPreviousPage
           startCursor
           endCursor
         }
       }
     }
    `,
      {
        variables: {
          query,
          first: direction === "first" || direction === "next" ? 25 : undefined,
          last: direction === "prev" ? 25 : undefined,
          after,
          before,
        },
      },
    );
    const { data } = await response.json();
    const productEdges = data.products.edges;
    const products = productEdges.map((edge: any) => {
      const node = edge.node;
      return {
        ...node,
        cursor: edge.cursor,
      };
    });
    const pageInfo = data.products.pageInfo;

    const countResponse = await admin.graphql(
      `#graphql
      query CountProducts($query: String, $first: Int) {
        products(query: $query, first: $first) {
          edges {
            node {
              id
            }
          }
        }
      }`,
      {
        variables: {
          query,
          first: 250,
        },
      },
    );
    const countData = await countResponse.json();
    const totalCount = countData.data.products.edges.length;

    return json({ products, searchQuery, pageInfo, totalCount });
  } catch (error: any) {
    console.error("GraphQL Error", error.message);
    throw new Response("Shopify GraphQL Error" + error.message, {
      status: 500,
    });
  }
};
