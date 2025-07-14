// app/routes/products.tsx
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { gql } from "graphql-request";
import {
  useLoaderData,
  useSearchParams,
  useNavigation,
} from "@remix-run/react";
import {
  Card,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Text,
  Tag,
  Pagination,
  InlineStack,
  Spinner,
  Banner,
  Page,
} from "@shopify/polaris";
import { useState } from "react";

const PAGE_SIZE = 10;

interface Product {
  id: string;
  title: string;
  tags: string[];
  cursor: string;
  images: {
    edges: Array<{
      node: {
        originalSrc: string;
        altText: string | null;
      };
    }>;
  };
}

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
  endCursor: string;
}

interface LoaderData {
  products: Product[];
  pageInfo: PageInfo;
  error?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      throw new Error("Failed to authenticate with Shopify");
    }

    const url = new URL(request.url);
    const after = url.searchParams.get("after");
    const before = url.searchParams.get("before");
    const direction = after ? "next" : before ? "prev" : "first";

    const productsQuery = gql`
      query Products($first: Int, $last: Int, $after: String, $before: String) {
        products(first: $first, last: $last, after: $after, before: $before) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              title
              tags
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
      first:
        direction === "next" || direction === "first" ? PAGE_SIZE : undefined,
      last: direction === "prev" ? PAGE_SIZE : undefined,
      after,
      before,
    };

    const response = await admin.graphql(productsQuery, { variables });

    if (!response) {
      throw new Error("No response from Shopify API");
    }

    const responseBody = await response.json();

    if (responseBody?.errors) {
      throw new Error(responseBody?.errors[0].message);
    }

    const productsData = responseBody.data?.products;

    if (!productsData) {
      throw new Error("No products data returned from Shopify API");
    }

    const { edges, pageInfo } = productsData;

    const products = edges.map((edge: any) => ({
      ...edge.node,
      cursor: edge.cursor,
    }));

    return json({ products, pageInfo });
  } catch (error) {
    console.error("Products loader error:", error);
    return json(
      {
        products: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: "",
          endCursor: "",
        },
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};

export default function ProductsPage() {
  const { products, pageInfo, error } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [count, setCount] = useState(0);
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  const handlePagination = (direction: "next" | "prev") => {
    const nextCount = count + 1; 
    setCount(nextCount);
    const cursor =
      direction === "next" ? pageInfo.endCursor : pageInfo.startCursor;
    const param = direction === "next" ? "after" : "before";
    
    const newParams = new URLSearchParams();
    newParams.set(param, cursor);
    newParams.set("page", count.toString());
    setSearchParams(newParams);
  };

  if (error) {
    return (
      <Page>
        <Card>
          <Banner title="Error" status="critical">
            <p>Failed to load products: {error}</p>
          </Banner>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Products">
      <Card>
        <ResourceList
          resourceName={{ singular: "product", plural: "products" }}
          items={products}
          renderItem={(product) => {
            const media = (
              <Thumbnail
                source={product.images?.edges?.[0]?.node?.originalSrc || ""}
                alt={
                  product.images?.edges?.[0]?.node?.altText || "Product Image"
                }
              />
            );

            return (
              <ResourceItem onClick={() => {}} id={product.id} media={media}>
                <Text as="h3" variant="bodyMd" fontWeight="bold">
                  {product.title}
                </Text>
                <InlineStack gap="200">
                  {product.tags.map((tag: string) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </InlineStack>
              </ResourceItem>
            );
          }}
        />
        {(pageInfo.hasNextPage || pageInfo.hasPreviousPage) && (
          <div style={{ padding: "16px 0" }}>
            <Pagination
              hasPrevious={pageInfo.hasPreviousPage}
              onPrevious={() => handlePagination("prev")}
              hasNext={pageInfo.hasNextPage}
              onNext={() => handlePagination("next")}
            />
          </div>
        )}
      </Card>
    </Page>
  );
}
