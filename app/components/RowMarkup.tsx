import {
  IndexTable,
  Text,
  Badge,
  Tag,
  Icon,
  LegacyStack,
} from "@shopify/polaris";
import { useCallback, useMemo, useState } from "react";
import { ProductIcon, XSmallIcon } from "@shopify/polaris-icons";

type Product = {
  id: string;
  title: string;
  tags: string[];
  status: string;
  featuredImage?: { url?: string; altText?: string };
};
export default function ({
  filteredProducts,
  selectedResources,
  onProductClick,
  onTags: { generateTags, setGenerateTags },
}: {
  filteredProducts: Product[];
  selectedResources: string[];
  onProductClick: (product: Product) => void;
  onTags: {
    generateTags: Product[];
    setGenerateTags: any;
  };
}) {
  // Create a memoized map of merged tags from generateTags
  const [showMoreId, setShowMoreId] = useState<string>("");
  const mergedTagsMap = useMemo(() => {
    if (!generateTags) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    console.log(generateTags);
    generateTags.forEach((product: Product) => {
      map.set(product.id, [...new Set(product.tags)]);
    });
    return map;
  }, [generateTags]);

  const removeTagsHandle = useCallback(
    ({ pid, tagTitle }: { pid: string; tagTitle: string }) => {
      setGenerateTags((prev: Product[]) => {
        return prev.map((product) => {
          if (product.id === pid) {
            // Remove the specific tag from this product
            const updatedTags = product.tags.filter((tag) => tag !== tagTitle);
            return { ...product, tags: updatedTags };
          }
          return product;
        });
      });
    },
    [setGenerateTags],
  );

  if (!filteredProducts.length) {
    return null;
  }
  const TagsComponent = (
    displayTags: string[],
    updatedTags: any,
    id: string,
  ): React.ReactNode => {
    const removeTagsHandle = ({
      pid,
      tagTitle,
    }: {
      pid: string;
      tagTitle: string;
    }) => {
      // your logic to remove tag
      console.log(`Removing ${tagTitle} from ${pid}`);
    };

    return (
      <IndexTable.Cell>
        {showMoreId != id
          ? displayTags
              .slice(0, 15)
              .map((tag: string) => <Tag key={tag}>{tag}</Tag>)
          : displayTags.map((tag: string) => <Tag key={tag}>{tag}</Tag>)}

        {updatedTags?.map((tag: string) => (
          <Tag
            key={tag + "-updated"}
            onRemove={() => removeTagsHandle({ pid: id, tagTitle: tag })}
          >
            {tag}
          </Tag>
        ))}
        {showMoreId != id && displayTags.length > 15 && (
          <div
            onClick={() => setShowMoreId(id)}
            style={{ display: "inline", cursor: "cell" }}
          >
            <Badge tone="info">
              {(displayTags.length - 8).toString()} more
            </Badge>
          </div>
        )}
        {showMoreId == id && (
          <div
            onClick={() => setShowMoreId("")}
            style={{ display: "inline", cursor: "cell" }}
          >
            <Badge tone="warning">hide</Badge>
          </div>
        )}
      </IndexTable.Cell>
    );
  };

  return filteredProducts.map(
    ({ id, title, status, featuredImage, tags }: Product, index: number) => {
      const updatedTags = mergedTagsMap
        .get(id)
        ?.filter((value) => !tags.includes(value));
      const displayTags = tags;

      return (
        <IndexTable.Row
          id={id}
          key={id}
          selected={selectedResources.includes(id)}
          position={index}
          onClick={() => {}}
        >
          {/* Image Cell */}
          <IndexTable.Cell className="app-tags--index-table-image-cell">
            <div
              onClick={() =>
                onProductClick({
                  id,
                  title,
                  status,
                  featuredImage,
                  tags: displayTags,
                })
              }
              style={{
                width: 40,
                height: 40,
                borderRadius: "4px",
                backgroundColor: "#f6f6f7",
                border: "1px solid #e1e3e5",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {featuredImage?.url ? (
                <img
                  src={featuredImage.url}
                  alt={featuredImage.altText || title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ opacity: 0.3 }}
                >
                  <path
                    d="M6.5 6C7.05228 6 7.5 5.55228 7.5 5C7.5 4.44772 7.05228 4 6.5 4C5.94772 4 5.5 4.44772 5.5 5C5.5 5.55228 5.94772 6 6.5 6Z"
                    fill="#637381"
                  />
                  <path
                    d="M18.5 2H1.5C0.67 2 0 2.67 0 3.5V16.5C0 17.33 0.67 18 1.5 18H18.5C19.33 18 20 17.33 20 16.5V3.5C20 2.67 19.33 2 18.5 2ZM18.5 16.5H1.5V5.5L5.65 9.65C5.85 9.85 6.16 9.85 6.36 9.65L9.22 6.79L14.36 11.93C14.56 12.13 14.87 12.13 15.07 11.93L18.5 8.5V16.5ZM1.5 3.5H18.5V7.5L14.94 11.06L9.9 6.02L6.74 9.18C6.35 9.57 5.72 9.57 5.33 9.18L1.5 5.35V3.5Z"
                    fill="#637381"
                  />
                </svg>
              )}
            </div>
          </IndexTable.Cell>

          {/* Title */}
          <IndexTable.Cell className="app-tags--table-title-cell">
            <div
              onClick={() =>
                onProductClick({
                  id,
                  title,
                  status,
                  featuredImage,
                  tags: displayTags,
                })
              }
            >
              <Text variant="bodyMd" fontWeight="medium" as="p" truncate>
                {title}
              </Text>
            </div>
          </IndexTable.Cell>

          {/* Status */}
          <IndexTable.Cell className="app-tags--table-status-cell">
            <Badge
              tone={
                status === "ACTIVE"
                  ? "success"
                  : status === "DRAFT"
                    ? "warning"
                    : "critical"
              }
            >
              {status.toLowerCase()}
            </Badge>
          </IndexTable.Cell>

          {/* Tags Count */}
          <IndexTable.Cell>{displayTags.length}</IndexTable.Cell>

          {/* Tags List </IndexTable.Cell> */}

          {TagsComponent(displayTags, updatedTags, id)}
        </IndexTable.Row>
      );
    },
  );
}
