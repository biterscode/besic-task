import { IndexTable, Text, Badge, Tag } from "@shopify/polaris";
export default function ({
  filteredProducts,
  selectedResources,
  onProductClick,
}: any) {
  if (!filteredProducts.length) {
    return;
  }
  return filteredProducts.map(
    ({ id, title, status, featuredImage, tags }: any, index: number) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
        onClick={() => {
          onProductClick({
            id,
            title,
            status,
            featuredImage,
            tags,
          });
        }}
      >
        <IndexTable.Cell className="app-tags--index-table-image-cell">
          <div
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
        <IndexTable.Cell className="app-tags--table-title-cell">
          <Text variant="bodyMd" fontWeight="medium" as="p" truncate>
            {title}
          </Text>
        </IndexTable.Cell>
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
        <IndexTable.Cell>{tags.length}</IndexTable.Cell>
        <IndexTable.Cell>
          {tags.slice(0, 8).map((tag: any) => (
            <Tag>{tag}</Tag>
          ))}
          {tags.length > 8 && (
            <Badge tone="info">{(tags.length - 8).toString()} more</Badge>
          )}
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );
}
