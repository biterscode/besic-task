import {
  Page,
  Layout,
  Card,
  TextField,
  Thumbnail,
  Badge,
  IndexTable,
  useIndexResourceState,
  Pagination,
  Box,
  Text,
  Button,
  ChoiceList,
  InlineStack,
  InlineGrid,
} from "@shopify/polaris";
import { useSearchParams } from "@remix-run/react";
import { useCallback, useState } from "react";

type Product = {
  id: string;
  title: string;
  tags: string[];
  status: string;
  inventory: string; // e.g., "0 in stock for 2 variants"
  category: string;
  channels: number;
  featuredImage?: {
    url: string;
    altText?: string;
  };
};

interface ProductListPageProps {
  products: Product[];
  pagination: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  currentPage: number;
  searchQuery: string;
}

export function ProductListPage({
  products,
  pagination,
  currentPage,
  searchQuery,
}: ProductListPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchParams({ search: value, page: "1" });
    },
    [setSearchParams],
  );

  const handlePagination = (direction: "next" | "previous") => {
    const newPage = direction === "next" ? currentPage + 1 : currentPage - 1;
    setSearchParams({ search: searchQuery, page: newPage.toString() });
  };

  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products);

  return (
    <Page
      title="Product Tag Manager"
      subtitle="Easily manage and organize your product tags"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <IndexTable
              resourceName={resourceName}
              itemCount={products.length}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Image" },
                { title: "Product" },
                { title: "Status" },
                { title: "Tags" },
              ]}
            >
              {products.map((product, index) => (
                <IndexTable.Row
                  id={product.id}
                  key={product.id}
                  selected={selectedResources.includes(product.id)}
                  position={index}
                >
                  <IndexTable.Cell>
                    <Thumbnail
                      source={
                        product.featuredImage?.url ||
                        "https://cdn.shopify.com/s/files/1/0752/6435/7165/files/placeholder-image.png"
                      }
                      alt={product.featuredImage?.altText || product.title}
                    />
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Box maxWidth="320px" paddingRight="400">
                      <Text
                        variant="bodyMd"
                        fontWeight="medium"
                        as="p"
                        truncate
                      >
                        {product.title}
                      </Text>
                    </Box>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Badge
                      status={
                        product.status.toUpperCase() === "ACTIVE"
                          ? "success"
                          : product.status.toUpperCase() === "ARCHIVED"
                            ? "critical"
                            : "attention"
                      }
                    >
                      {product.status.charAt(0).toUpperCase() +
                        product.status.slice(1).toLowerCase()}
                    </Badge>
                  </IndexTable.Cell>
                  <IndexTable.Cell>{product.tags.length}</IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Box
            paddingBlockStart="400"
            paddingBlockEnd="400"
            paddingInline="400"
          >
            <Pagination
              hasPrevious={pagination.hasPreviousPage}
              hasNext={pagination.hasNextPage}
              onPrevious={() => handlePagination("previous")}
              onNext={() => handlePagination("next")}
            />
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
