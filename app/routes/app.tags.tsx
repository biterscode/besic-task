import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  TextField,
  IndexTable,
  LegacyCard,
  IndexFilters,
  useSetIndexFiltersMode,
  useIndexResourceState,
  ChoiceList,
  Page,
  Card,
} from "@shopify/polaris";
import type { IndexFiltersProps, TabProps } from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  useActionData,
  useLoaderData,
  useSearchParams,
  useNavigation,
} from "@remix-run/react";

import RowMarkup from "app/components/RowMarkup";
import { fetchProductsFromApi } from "app/utils/productApi";
import { ProductDetailPopup } from "app/components/ProductDetailPopup";
import GenarateTagForAll from "app/components/GenerateTagForAll";
type Product = {
  id: string;
  title: string;
  tags: string[];
  status: string;
  featuredImage?: { url?: string; altText?: string };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const taggedWith = url.searchParams.get("taggedWith") || "";
    const after = url.searchParams.get("after");
    const before = url.searchParams.get("before");
    const sortKey = url.searchParams.get("sortKey") || "TITLE";
    const reverse = url.searchParams.get("reverse") === "true";

    let queryParts = [];
    if (searchQuery) {
      queryParts.push(
        `(title:*${searchQuery}* OR tag:*${searchQuery}* OR product_type:*${searchQuery}* OR vendor:*${searchQuery}*)`,
      );
    }

    if (status) queryParts.push(`status:${status}`);
    if (taggedWith) queryParts.push(`tag:${taggedWith}`);

    const query = queryParts.length > 0 ? queryParts.join(" AND ") : undefined;
    const direction = after ? "next" : before ? "prev" : "first";

    const response = await admin.graphql(
      `#graphql
      query FetchProducts($query: String, $first: Int, $last: Int, $after: String, $before: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
        products(query: $query, first: $first, last: $last, after: $after, before: $before, sortKey: $sortKey, reverse: $reverse) {
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
      }`,
      {
        variables: {
          query,
          first:
            direction === "first" || direction === "next" ? 250 : undefined,
          last: direction === "prev" ? 250 : undefined,
          after,
          before,
          sortKey,
          reverse,
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

    return json({
      pr: products,
      searchQuery,
      pI: data.products.pageInfo,
      statusFilter: status,
      taggedWithFilter: taggedWith,
      sortKey,
      reverse,
    });
  } catch (error: any) {
    console.error("GraphQL Error", error.message);
    throw new Response("Shopify GraphQL Error Loader : " + error.message, {
      status: 500,
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "cancel") {
    return json({ cancelled: true });
  }
  try {
    const selectedProductIds = formData.get("selectedProductIds");
    const isBulkUpdate = selectedProductIds !== null;
    if (isBulkUpdate) {
      const tags = JSON.parse(formData.get("tags") as string);
      const updatePromises = tags.map((productTags: any) =>
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
  const {
    pr,
    searchQuery,
    pI,
    statusFilter,
    taggedWithFilter,
    sortKey,
    reverse,
  } = useLoaderData<typeof loader>();
  const actionReaponce = useActionData<any>();
  const [pageInfo, setPageInfo] = useState(pI);
  const [products, setProducts] = useState(pr);
  const [searchProduct, setSearchProduct] = useState([]);
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(navigation.state === "loading");
  const isNavigation = navigation.state === "loading";
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [searchParams, setSearchParams] = useSearchParams();
  // Initialize filter state from URL params
  const [productStatus, setProductStatus] = useState<string[] | undefined>(
    statusFilter ? statusFilter.split(",") : undefined,
  );
  const [taggedWith, setTaggedWith] = useState(taggedWithFilter || "");
  const [queryValue, setQueryValue] = useState(searchQuery || "");
  const [tags, setTags] = useState<Product[]>([]);
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const [itemStrings, setItemStrings] = useState(["All", "Active", "Draft"]);

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

  useEffect(() => {
    setPageInfo(pI);
    setProducts(pr);
  }, [pr]);

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
    onAction: () => {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("after");
      newParams.delete("before");
      newParams.delete("status");

      if (item !== "All") {
        newParams.set("status", item.toUpperCase());
      }

      setSearchParams(newParams);
      setSelected(index);
    },
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
    { label: "Product (A-Z)", value: "TITLE asc", directionLabel: "A-Z" },
    { label: "Product (Z-A)", value: "TITLE desc", directionLabel: "Z-A" },
    {
      label: "Recently updated",
      value: "UPDATED_AT desc",
      directionLabel: "Newest first",
    },
    {
      label: "Oldest updated",
      value: "UPDATED_AT asc",
      directionLabel: "Oldest first",
    },
    {
      label: "Recently created",
      value: "CREATED_AT desc",
      directionLabel: "Newest first",
    },
    {
      label: "Oldest created",
      value: "CREATED_AT asc",
      directionLabel: "Oldest first",
    },
  ];
  const [sortSelected, setSortSelected] = useState<string[]>([
    `${sortKey}_${reverse ? "desc" : "asc"}`,
  ]);

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
  const [inventoryRange, setInventoryRange] = useState<
    [number, number] | undefined
  >(undefined);

  // Handle sort change
  const handleSortChange = useCallback(
    (value: string[]) => {
      const [sortKey, direction] = value[0].split(" ");
      const reverse = direction === "desc";

      const newParams = new URLSearchParams(searchParams);
      newParams.set("sortKey", sortKey);
      newParams.set("reverse", reverse.toString());
      newParams.delete("after");
      newParams.delete("before");

      setSearchParams(newParams);
      setSortSelected(value);
    },
    [searchParams, setSearchParams],
  );

  const handleProductStatusChange = useCallback(
    (value: string[]) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("after");
      newParams.delete("before");
      if (value.length > 0) {
        newParams.set("status", value.join(","));
      } else {
        newParams.delete("status");
      }
      setSearchParams(newParams);
      setProductStatus(value);
    },
    [searchParams, setSearchParams],
  );

  const handleTaggedWithChange = useCallback(
    (value: string) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("after");
      newParams.delete("before");
      if (value) {
        newParams.set("taggedWith", value);
      } else {
        newParams.delete("taggedWith");
      }
      setSearchParams(newParams);
      setTaggedWith(value);
    },
    [searchParams, setSearchParams],
  );

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const queryRef = useRef("");

  const handleFiltersQueryChange = useCallback(
    (value: string) => {
      setQueryValue(value);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("after");
        newParams.delete("before");
        if (value.trim()) {
          newParams.set("search", value.trim());
        } else {
          newParams.delete("search");
        }
        setSearchParams(newParams);
      }, 300);
    },
    [searchParams, setSearchParams],
  );
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
    setProductStatus(undefined);
    setTaggedWith("");
    setQueryValue("");
    const newParams = new URLSearchParams();
    setSearchParams(newParams);
  }, [
    handleProductStatusRemove,
    handleInventoryRangeRemove,
    handleQueryValueRemove,
    handleTaggedWithRemove,
  ]);

  // PAGINATOIN USING SERVER

  const handlePagination = (direction: "next" | "prev") => {
    const cursor =
      direction === "next" ? pageInfo.endCursor : pageInfo.startCursor;
    const param = direction === "next" ? "after" : "before";

    let flag = direction === "next" ? pageNumber + 1 : pageNumber - 1;
    setPageNumber(flag);

    const newParams = new URLSearchParams(searchParams);
    newParams.set(param, cursor ?? "");
    newParams.delete(direction === "next" ? "before" : "after");
    setSearchParams(newParams);
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

  const { filteredProducts } = useMemo(() => {
    const filteredProducts = [...products, ...searchProduct].filter(
      (product: any) => {
        if (productStatus?.length && !productStatus.includes(product.status)) {
          return false;
        }
        if (taggedWith) {
          const tagsArray = Array.isArray(product.tags)
            ? product.tags
            : [product.tags];
          if (!tagsArray.some((tag: any) => tag.includes(taggedWith))) {
            return false;
          }
        }
        if (queryValue) {
          return product.title.toLowerCase().includes(queryValue.toLowerCase());
        }
        return true;
      },
    );
    return { filteredProducts };
  }, [products, searchProduct, productStatus, taggedWith, queryValue]);

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
    <Page title="Product Tags" fullWidth >
    <div style={{display:"grid",gap:"10px"}}>
      <Card>
        <GenarateTagForAll
          onTagsUpdated={handleTagsUpdated}
          avalableProducts={products}
          selectedResources={selectedResources}
          useTags={{ tags, setTags }}
        />
      </Card>

      <LegacyCard>
        <IndexFilters
          sortOptions={sortOptions}
          sortSelected={sortSelected}
          queryValue={queryValue}
          queryPlaceholder="Search products"
          onQueryChange={handleFiltersQueryChange}
          onQueryClear={() => {
            setQueryValue("");
            handleFiltersQueryChange("");
            setSearchProduct([]);
          }}
          onSort={handleSortChange}
          primaryAction={primaryAction}
          cancelAction={{
            onAction: onHandleCancel,
            disabled: false,
            loading: isLoading || isNavigation,
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
        {/* <div style={{ height: "400px", overflowY: "auto" }}> */}
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
          pagination={{
            hasNext: !!pageInfo.hasNextPage,
            hasPrevious: !!pageInfo.hasPreviousPage,
            onNext: () => handlePagination("next"),
            onPrevious: () => handlePagination("prev"),
            label: `Page ${pageNumber}`,
          }}
        >
          <RowMarkup
            filteredProducts={filteredProducts}
            selectedResources={selectedResources}
            onProductClick={handleProductClick}
            onTags={{ generateTags: tags, setGenerateTags: setTags }}
          />
        </IndexTable>
        {/* </div> */}
      </LegacyCard>
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
