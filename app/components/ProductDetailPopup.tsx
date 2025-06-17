import { Form, useNavigation } from "@remix-run/react";
import {
  Modal,
  Text,
  Button,
  Image,
  BlockStack,
  Badge,
  Icon,
  InlineStack,
  Box,
  Select,
  Tag,
  TextField,
  TextContainer,
  Grid,
  ButtonGroup,
} from "@shopify/polaris";
import { ProductIcon, XSmallIcon } from "@shopify/polaris-icons";
import { useCallback, useEffect, useState } from "react";

export function ProductDetailPopup({
  product,
  open,
  onClose,
}: {
  product: any;
  open: boolean;
  onClose: () => void;
}) {
  if (!product) return null;

  const navigation = useNavigation();
  const [newTag, setNewTag] = useState("");
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const currentTags = product.tags || [];
  const allTags = [...new Set([...currentTags, ...generatedTags])];
  const [isDirty, setIsDirty] = useState(false);
  const handleRemoveCurrentTag = useCallback(
    (tagToRemove: string) => {
      setGeneratedTags([...generatedTags, tagToRemove]);
      setIsDirty(true);
    },
    [generatedTags],
  );
  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      setGeneratedTags(generatedTags.filter((tag) => tag !== tagToRemove));
      setIsDirty(true);
    },
    [generatedTags],
  );

  const handleClearTags = () => {
    setGeneratedTags([]);
    setIsDirty(true);
  };
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleGenerateTags = useCallback(() => {
    const cleanedTitle = product.title
      .replace(/[′'"“”‘’`]/g, "") // Remove prime, double/single/smart quotes, backticks
      .toLowerCase(); // Convert to lowercase

    const baseTags = cleanedTitle
      .split(/[\s,\-×]+/)
      .filter((word: string) => word.length > 2);
    const dimensionRegex = /(\d+(\.\d+)?)[^\d]*(\d+(\.\d+)?)/;
    const match = cleanedTitle.match(dimensionRegex);
    let sizeTags: string[] = [];
    if (match) {
      const width = match[1];
      const height = match[3];
      sizeTags = [
        `${width}x${height}`,
        `${width} x ${height}`,
        `${width}X${height}`,
        `${width} X ${height}`,
      ];
    }
    const generated = [...baseTags, ...sizeTags].filter(
      (tag) => tag.length > 2 && !allTags.includes(tag),
    );
    setGeneratedTags([...new Set([...generatedTags, ...generated])]);
    setIsDirty(true);
  }, [product.title, generatedTags, allTags]);

  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !allTags.includes(newTag.trim())) {
      setGeneratedTags([...generatedTags, newTag.trim()]);
      setNewTag("");
      setIsDirty(true);
    }
  }, [newTag, generatedTags, allTags]);

  useEffect(() => {
    handleClearTags();
  }, [product]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <>
          {product.title}
          <Badge
            tone={
              product.status === "ACTIVE"
                ? "success"
                : product.status === "DRAFT"
                  ? "warning"
                  : "critical"
            }
          >
            {product.status.toLowerCase()}
          </Badge>
        </>
      }
      size="large"
    >
      <Modal.Section>
        <Form method="post">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="tags" value={JSON.stringify(allTags)} />
          <BlockStack gap="400">
            <Grid>
              <Grid.Cell columnSpan={{ xs: 3, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Box
                  paddingBlockStart="200"
                  paddingBlockEnd="400"
                  id="product-detail-popup--image-box"
                >
                  <img
                    src={
                      product?.featuredImage?.url ||
                      "https://demofree.sirv.com/nope-not-here.jpg"
                    }
                    alt={product?.featuredImage?.altText || product.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "4px",
                      objectFit: "cover",
                    }}
                  />
                </Box>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 9, xl: 9 }}>
                <BlockStack gap={"500"}>
                  <Box
                    paddingBlockStart="200"
                    borderColor={"border-brand"}
                    borderWidth={"0165"}
                    padding="500"
                    borderRadius={"200"}
                  >
                    <Text variant="headingSm" as="h3">
                      Current Tags
                      <Badge tone="info" size="small">
                        {currentTags.length}
                      </Badge>
                    </Text>
                    <Box paddingBlockStart="200">
                      {currentTags.length > 0 ? (
                        <BlockStack gap="200">
                          <InlineStack gap="200" wrap>
                            {currentTags.map((tag: string) => (
                              <Tag key={tag}>
                                <InlineStack gap="100" blockAlign="center">
                                  <Text as="span" variant="bodyMd">
                                    {tag}
                                  </Text>
                                  <Button
                                    variant="plain"
                                    icon={XSmallIcon}
                                    size="slim"
                                    onClick={() => handleRemoveCurrentTag(tag)}
                                    accessibilityLabel={`Remove ${tag}`}
                                  />
                                </InlineStack>
                              </Tag>
                            ))}
                          </InlineStack>
                        </BlockStack>
                      ) : (
                        <Text as="p" tone="subdued">
                          No tags assigned to this product
                        </Text>
                      )}
                    </Box>
                  </Box>
                  <Box
                    paddingBlockStart="200"
                    borderColor={"border-brand"}
                    borderWidth={"0165"}
                    padding="500"
                    borderRadius={"200"}
                  >
                    <Text variant="headingSm" as="h3">
                      New Tags
                      <Badge tone="new" size="small">
                        {generatedTags.length.toString()}
                      </Badge>
                    </Text>
                    <Box paddingBlockStart="200">
                      {generatedTags.length > 0 ? (
                        <BlockStack gap="200">
                          <InlineStack gap="200" wrap>
                            {generatedTags.map((tag) => (
                              <Tag key={tag}>
                                <InlineStack gap="100" blockAlign="center">
                                  <Text as="span" variant="bodyMd">
                                    {tag}
                                  </Text>
                                  <Button
                                    variant="plain"
                                    icon={XSmallIcon}
                                    size="slim"
                                    onClick={() => handleRemoveTag(tag)}
                                    accessibilityLabel={`Remove ${tag}`}
                                  />
                                </InlineStack>
                              </Tag>
                            ))}
                          </InlineStack>
                        </BlockStack>
                      ) : (
                        <Text as="p" tone="subdued">
                          No new tags added yet
                        </Text>
                      )}
                    </Box>
                  </Box>
                </BlockStack>
              </Grid.Cell>
            </Grid>

            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="end">
                <div
                  style={{ marginBottom: 10 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // Prevent form submission
                      handleAddTag(); // Trigger your add function
                    }
                  }}
                >
                  <TextField
                    label="Add New Tag"
                    value={newTag}
                    placeholder="Type Tag Title"
                    onChange={setNewTag}
                    autoComplete="off"
                    connectedRight={
                      <div style={{ display: "flex", gap: "5px" }}>
                        <Button
                          onClick={handleAddTag}
                          disabled={!newTag.trim()}
                        >
                          Add
                        </Button>
                      </div>
                    }
                  />
                  <TextContainer spacing="tight">
                    <Text as="p" tone="subdued" variant="bodySm">
                      Press Enter to add tags quickly
                    </Text>
                  </TextContainer>
                </div>
              </InlineStack>
              <ButtonGroup>
                <Button onClick={handleGenerateTags} disabled={!product.title}>
                  Genarate Tags
                </Button>
                <Button
                  onClick={handleClearTags}
                  variant="plain"
                  tone="critical"
                >
                  Clear Tags
                </Button>
              </ButtonGroup>
            </BlockStack>

            <InlineStack gap="200">
              <Button
                submit
                variant="primary"
                loading={navigation.state === "submitting"}
                disabled={!isDirty}
              >
                Save Tags
              </Button>
              <Button submit variant="plain" disabled={!isDirty}>
                Cancel
              </Button>
            </InlineStack>
          </BlockStack>
        </Form>
      </Modal.Section>
    </Modal>
  );
}
