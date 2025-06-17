import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  TextField,
  IndexTable,
  LegacyCard,
  IndexFilters,
  useSetIndexFiltersMode,
  useIndexResourceState,
  Text,
  ChoiceList,
  Page,
  Card,
  Pagination,
} from "@shopify/polaris";
import type { IndexFiltersProps, TabProps } from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  useActionData,
  useLoaderData,
  useSearchParams,
} from "@remix-run/react";

import RowMarkup from "app/components/RowMarkup";
import {
  fetchProductsFromApi,
  fetchProductsSearchFromApi,
} from "app/utils/productApi";
import { ProductDetailPopup } from "app/components/ProductDetailPopup";
import GenarateTagForAll from "app/components/GenerateTagForAll";
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
       products(query: $query, first: $first, last: $last, after: $after, before: $before) {
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
    return json({ pr: products, searchQuery, pI: pageInfo, totalCount });
  } catch (error: any) {
    console.error("GraphQL Error", error.message);
    throw new Response("Shopify GraphQL Error" + error.message, {
      status: 500,
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Handle cancel action
  if (intent === "cancel") {
    return json({ cancelled: true });
  }

  try {
    // Check if this is a bulk update (has selectedProductIds)
    const selectedProductIds = formData.get("selectedProductIds");
    
    const isBulkUpdate = selectedProductIds !== null;
    console.log(isBulkUpdate);
    if (isBulkUpdate) {
      const tags = JSON.parse(formData.get("tags") as string);
      console.log(tags);
      const updatePromises = tags.map((productTags:any) =>
        admin.graphql(
          `#graphql
          mutation productUpdate($input: ProductInput!) {
            productUpdate(input:$input) {
              product {
                id
                title
                tags
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              input: {
                id: productTags.id,
                tags: productTags.tags,
              },
            },
          },
        ),
      );

      const results = await Promise.all(updatePromises);
      const jsonResults = await Promise.all(results.map((r) => r.json()));

      // Check for errors
      const errors = jsonResults.flatMap(
        (result) => result.data?.productUpdate?.userErrors || [],
      );

      if (errors.length > 0) {
        return json({ errors });
      }

      const updatedProducts = jsonResults.map(
        (result) => result.data?.productUpdate?.product,
      );

      return json({
        success: true,
        updatedCount: updatedProducts.length,
        isBulkUpdate: true,
      });
    } else {
      // Handle single product update (from ProductDetailPopup)
      const productId = formData.get("productId");
      const tags = formData.get("tags");

      const response = await admin.graphql(
        `#graphql
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input:$input) {
            product {
              id
              title
              tags
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            input: {
              id: productId,
              tags: JSON.parse(tags as string),
            },
          },
        },
      );

      const { data } = await response.json();

      if (data.productUpdate.userErrors.length > 0) {
        return json({ errors: data.productUpdate.userErrors });
      }

      return json({
        success: true,
        product: data.productUpdate.product,
        isBulkUpdate: false,
      });
    }
  } catch (error) {
    return json({ errors: [{ message: "Failed to update tags" }] });
  }
};

export default function ProductsIndex() {
  const { pr, searchQuery, pI, totalCount } = useLoaderData<typeof loader>();
  const actionReaponce = useActionData<any>();
  const [pageInfo, setPageInfo] = useState(pI);
  const [products, setProducts] = useState(pr);
  const [searchProduct, setSearchProduct] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const [itemStrings, setItemStrings] = useState([
    "All",
    "Active",
    "Draft",
    "Archived",
  ]);

  useEffect(() => {
    if (actionReaponce?.success && actionReaponce.product) {
      const updatedProduct = actionReaponce.product;
      setProducts((prevProducts: any) =>
        prevProducts.map((product: any) =>
          product.id === updatedProduct.id
            ? { ...product, tags: updatedProduct.tags }
            : product,
        ),
      );
    }
    console.log(actionReaponce);
  }, [actionReaponce]);

  const deleteView = (index: number) => {
    const newItemStrings = [...itemStrings];
    newItemStrings.splice(index, 1);
    setItemStrings(newItemStrings);
    setSelected(0);
  };

  const duplicateView = async (name: string) => {
    setItemStrings([...itemStrings, name]);
    setSelected(itemStrings.length);
    await sleep(1);
    return true;
  };
  const tabs: TabProps[] = itemStrings.map((item, index) => ({
    content: item,
    index,
    onAction: () => {},
    id: `${item}-${index}`,
    isLocked: index === 0,
    actions:
      index === 0
        ? []
        : [
            {
              type: "rename",
              onAction: () => {},
              onPrimaryAction: async (value: string): Promise<boolean> => {
                const newItemsStrings = tabs.map((item, idx) => {
                  if (idx === index) {
                    return value;
                  }
                  return item.content;
                });
                await sleep(1);
                setItemStrings(newItemsStrings);
                return true;
              },
            },
            {
              type: "duplicate",
              onPrimaryAction: async (value: string): Promise<boolean> => {
                await sleep(1);
                duplicateView(value);
                return true;
              },
            },
            {
              type: "edit",
            },
            {
              type: "delete",
              onPrimaryAction: async () => {
                await sleep(1);
                deleteView(index);
                return true;
              },
            },
          ],
  }));
  const [selected, setSelected] = useState(0);
  const onCreateNewView = async (value: string) => {
    await sleep(500);
    setItemStrings([...itemStrings, value]);
    setSelected(itemStrings.length);
    return true;
  };

  const sortOptions: IndexFiltersProps["sortOptions"] = [
    { label: "Product", value: "title asc", directionLabel: "A-Z" },
    { label: "Product", value: "title desc", directionLabel: "Z-A" },
    { label: "tags", value: "tags asc", directionLabel: "asc" },
    { label: "tags", value: "tags desc", directionLabel: "desc" },
  ];

  const [sortSelected, setSortSelected] = useState(["title asc"]);
  const { mode, setMode } = useSetIndexFiltersMode();
  const onHandleCancel = () => {};
  const onHandleSave = async () => {
    await sleep(1);
    return true;
  };

  const primaryAction: IndexFiltersProps["primaryAction"] =
    selected === 0
      ? {
          type: "save-as",
          onAction: onCreateNewView,
          disabled: false,
          loading: false,
        }
      : {
          type: "save",
          onAction: onHandleSave,
          disabled: false,
          loading: false,
        };

  const [productStatus, setProductStatus] = useState<string[] | undefined>(
    undefined,
  );
  const [inventoryRange, setInventoryRange] = useState<
    [number, number] | undefined
  >(undefined);
  const [taggedWith, setTaggedWith] = useState("");
  const [queryValue, setQueryValue] = useState("");

  const handleProductStatusChange = useCallback(
    (value: string[]) => setProductStatus(value),
    [],
  );
  const handleTaggedWithChange = useCallback(
    (value: string) => setTaggedWith(value),
    [],
  );

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const queryRef = useRef("");

  const handleFiltersQueryChange = useCallback((value: string) => {
    setQueryValue(value);
    queryRef.current = value;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete("after");
      newParams.delete("before");
      if (value.trim()) {
        newParams.set("search", value.trim());
      } else {
        newParams.delete("search");
      }
      setIsLoading(true);
      fetchProductsFromApi(newParams.toString())
        .then((apiData) => {
          console.log(apiData);
          setSearchProduct(apiData.products);
        })
        .catch((error) => {
          console.error("API search error:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 300);
  }, []);

  const handleProductStatusRemove = useCallback(
    () => setProductStatus(undefined),
    [],
  );
  const handleInventoryRangeRemove = useCallback(
    () => setInventoryRange(undefined),
    [],
  );
  const handleTaggedWithRemove = useCallback(() => setTaggedWith(""), []);
  const handleQueryValueRemove = useCallback(() => setQueryValue(""), []);
  const handleFiltersClearAll = useCallback(() => {
    handleProductStatusRemove();
    handleInventoryRangeRemove();
    handleTaggedWithRemove();
    handleQueryValueRemove();
    setSearchProduct([]);
  }, [
    handleProductStatusRemove,
    handleInventoryRangeRemove,
    handleQueryValueRemove,
    handleTaggedWithRemove,
  ]);

  const [searchParams] = useSearchParams();

  const handlePagination = (direction: "next" | "prev") => {
    const cursor =
      direction === "next" ? pageInfo.endCursor : pageInfo.startCursor;
    const param = direction === "next" ? "after" : "before";
    const newParams = new URLSearchParams(searchParams);
    newParams.set(param, cursor ?? "");
    newParams.delete(direction === "next" ? "before" : "after");
    setIsLoading(true);
    fetchProductsFromApi(newParams.toString())
      .then((apiData) => {
        console.log(apiData);
        setProducts(apiData.products);
        setPageInfo(apiData.pageInfo);
      })
      .catch((error) => {
        console.error("API pagination error:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
    window.history.replaceState({}, "", `?${newParams.toString()}`);
  };

  const filters = [
    {
      key: "productStatus",
      label: "Product status",
      filter: (
        <ChoiceList
          title="Product status"
          titleHidden
          choices={[
            { label: "Active", value: "ACTIVE" },
            { label: "Draft", value: "DRAFT" },
            { label: "Archived", value: "ARCHIVED" },
          ]}
          selected={productStatus || []}
          onChange={handleProductStatusChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: "taggedWith",
      label: "Tagged with",
      filter: (
        <TextField
          label="Tagged with"
          value={taggedWith}
          onChange={handleTaggedWithChange}
          autoComplete="off"
          labelHidden
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters: IndexFiltersProps["appliedFilters"] = [];
  if (productStatus && !isEmpty(productStatus)) {
    const key = "productStatus";
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, productStatus),
      onRemove: handleProductStatusRemove,
    });
  }
  if (inventoryRange) {
    const key = "inventoryRange";
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, inventoryRange),
      onRemove: handleInventoryRangeRemove,
    });
  }
  if (!isEmpty(taggedWith)) {
    const key = "taggedWith";
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, taggedWith),
      onRemove: handleTaggedWithRemove,
    });
  }

  // First, filter products based on status, tags, and search query
  const filteredProducts = [...products, ...searchProduct].filter(
    (product: any) => {
      // Filter by product status
      if (productStatus?.length && !productStatus.includes(product.status)) {
        return false;
      }
      // Filter by tags
      if (taggedWith) {
        const tagsArray = Array.isArray(product.tags)
          ? product.tags
          : [product.tags];
        if (!tagsArray.some((tag: any) => tag.includes(taggedWith))) {
          return false;
        }
      }

      // Filter by search query (if present)
      if (queryValue) {
        return product.title.toLowerCase().includes(queryValue.toLowerCase());
      }

      return true;
    },
  );

  // Then sort the filtered products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const sortValue = sortSelected[0];

    switch (sortValue) {
      case "title asc":
        return a.title.localeCompare(b.title);
      case "title desc":
        return b.title.localeCompare(a.title);
      case "tags asc":
        return (a.tags?.length || 0) - (b.tags?.length || 0);
      case "tags desc":
        return (b.tags?.length || 0) - (a.tags?.length || 0);
      default:
        return 0;
    }
  });
  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(filteredProducts);
  const rows = [
    ["Emerald Silk Gown", "$875.00", 124689, 140, "$122,500.00"],
    ["Mauve Cashmere Scarf", "$230.00", 124533, 83, "$19,090.00"],
    [
      "Navy Merino Wool Blazer with khaki chinos and yellow belt",
      "$445.00",
      124518,
      32,
      "$14,240.00",
    ],
  ];

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Add this function to handle opening the popup
  const handleProductClick = useCallback((product: any) => {
    setSelectedProduct(product);
    setIsPopupOpen(true);
  }, []);

  const handleTagsUpdated = (updatedProducts: any[]) => {
    setProducts((prevProducts: any) =>
      prevProducts.map((product: any) => {
        const updatedProduct = updatedProducts.find((p) => p.id === product.id);
        return updatedProduct ? updatedProduct : product;
      }),
    );
  };

  return (
    <Page title="Product Tags" fullWidth>
      <div style={{ width: "90%", margin: "0 auto" }}>
        <LegacyCard>
          <IndexFilters
            sortOptions={sortOptions}
            sortSelected={sortSelected}
            queryValue={queryValue}
            queryPlaceholder="Search products"
            onQueryChange={handleFiltersQueryChange}
            onQueryClear={() => {
              setQueryValue("");
              setSearchProduct([]);
            }}
            onSort={setSortSelected}
            primaryAction={primaryAction}
            cancelAction={{
              onAction: onHandleCancel,
              disabled: false,
              loading: isLoading,
            }}
            tabs={tabs}
            selected={selected}
            onSelect={setSelected}
            canCreateNewView
            onCreateNewView={onCreateNewView}
            filters={filters}
            appliedFilters={appliedFilters}
            onClearAll={handleFiltersClearAll}
            mode={mode}
            setMode={setMode}
          />
          <div style={{ height: "400px", overflowY: "auto" }}>
            <IndexTable
              resourceName={resourceName}
              itemCount={filteredProducts.length}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Image" },
                { title: "Product" },
                { title: "Status" },
                { title: "Tags" },
                { title: "Tags Titles" },
              ]}
            >
              <RowMarkup
                filteredProducts={sortedProducts}
                selectedResources={selectedResources}
                onProductClick={handleProductClick}
              />
            </IndexTable>
          </div>
        </LegacyCard>

        <Card>
          <div className="app-tags--pagination-bottom">
            <Pagination
              nextTooltip="next"
              previousTooltip="prev"
              label={
                <span style={{ fontSize: "14px", color: "#333" }}>
                  Page Nagigation 📃
                </span>
              }
              hasPrevious={!!pageInfo.hasPreviousPage}
              hasNext={!!pageInfo.hasNextPage}
              onPrevious={() => handlePagination("prev")}
              onNext={() => handlePagination("next")}
            />
            {/* All Genarate Gatags For Compoment */}
            <GenarateTagForAll
              onTagsUpdated={handleTagsUpdated}
              avalableProducts={products}
              selectedResources={selectedResources}
            />
          </div>
        </Card>
      </div>
      <ProductDetailPopup
        product={selectedProduct}
        open={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
      />
    </Page>
  );

  function disambiguateLabel(key: string, value: string | any[]): string {
    switch (key) {
      case "inventoryRange":
        return `Inventory is between ${value[0]} and ${value[1]}`;
      case "taggedWith":
        return `Tagged with ${value}`;
      case "productStatus":
        return (value as string[])
          .map((val) => `${val.toLowerCase()}`)
          .join(", ");
      default:
        return value as string;
    }
  }
  function isEmpty(value: string | any[]) {
    if (Array.isArray(value)) {
      return value.length === 0;
    } else {
      return value === "" || value == null;
    }
  }
}
