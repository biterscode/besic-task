import { Form, useNavigation } from "@remix-run/react";
import {
  Button,
  BlockStack,
  InlineStack,
  TextField,
  TextContainer,
  Text,
  ButtonGroup,
  Badge,
  Box,
  Tag,
} from "@shopify/polaris";
import { XSmallIcon } from "@shopify/polaris-icons";
import { useCallback, useState, useEffect, useRef } from "react";

type Product = { id: string; title: string; tags: string[] };

export default function GenarateTagForAll({
  selectedResources,
  avalableProducts,
  onTagsUpdated,
}: {
  selectedResources: string[];
  avalableProducts: Product[];
  onTagsUpdated: (updatedProducts: Product[]) => void;
}) {
  const navigation = useNavigation();
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [Tags, setTags] = useState<any>([]);
  const [generatedTagsMap, setGeneratedTagsMap] = useState<
    Record<string, string[]>
  >({});
  const [newTag, setNewTag] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Track selected IDs in a ref to detect changes
  const prevSelectedRef = useRef<string[]>([]);

  // When selectedResources changes, remove generated tags for unselected products
  useEffect(() => {
    // Remove generated tags for unselected
    const updatedMap: Record<string, string[]> = {};
    selectedResources.forEach((id) => {
      if (generatedTagsMap[id]) updatedMap[id] = generatedTagsMap[id];
    });
    setGeneratedTagsMap(updatedMap);
    prevSelectedRef.current = selectedResources;
    setIsDirty(false); // Reset dirty
  }, [selectedResources]);

  // Handle adding manual tag
  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !manualTags.includes(newTag.trim())) {
      setManualTags((prev) => [...prev, newTag.trim()]);
      setNewTag("");
      setIsDirty(true);
    }
  }, [newTag, manualTags]);

  // Handle remove manual tag
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setManualTags((prev) => prev.filter((tag) => tag !== tagToRemove));
    setIsDirty(true);
  }, []);

  // Handle "Generate Tags" per selected product
  const handleGenerateTags = useCallback(() => {
    const newGenerated: Record<string, string[]> = {};
    avalableProducts.forEach((product) => {
      if (selectedResources.includes(product.id)) {
        const cleanedTitle = product.title
          .replace(/[′'"“”‘’`]/g, "")
          .toLowerCase();
        const baseTags = cleanedTitle
          .split(/[\s,\-×]+/)
          .filter((word: string) => word.length > 2);

        // Optionally: parse size/dimension from title
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

        // Only use unique tags for this product
        newGenerated[product.id] = Array.from(
          new Set([...baseTags, ...sizeTags]),
        );
      }
    });
    setGeneratedTagsMap(newGenerated);
    setIsDirty(true);
  }, [avalableProducts, selectedResources]);

  // Clear all manual and generated tags
  const handleClearTags = () => {
    setManualTags([]);
    setGeneratedTagsMap({});
    setIsDirty(false);
  };

  // Apply manual and generated tags to selected products
  // Apply manual and generated tags to selected products
  const applyTagsToProducts = async (e: React.FormEvent) => {
    // Calculate the updated products first
    const updatedProducts = avalableProducts
      .filter((p) => selectedResources.includes(p.id))
      .map((product) => {
        const productGeneratedTags = generatedTagsMap[product.id] ?? [];
        // Only add new tags (manual + generated) that are not already present
        const newTags = [
          ...product.tags,
          ...manualTags.filter((tag) => !product.tags.includes(tag)),
          ...productGeneratedTags.filter((tag) => !product.tags.includes(tag)),
        ];
        return { ...product, tags: Array.from(new Set(newTags)) };
      });

    // Update the state and call the callback
    setTags(updatedProducts);
    setIsDirty(false);
    onTagsUpdated(updatedProducts);
  };

  useEffect(() => {
    const updatedProducts = avalableProducts
      .filter((p) => selectedResources.includes(p.id))
      .map((product) => {
        const productGeneratedTags = generatedTagsMap[product.id] ?? [];
        const newTags = [
          ...product.tags,
          ...manualTags.filter((tag) => !product.tags.includes(tag)),
          ...productGeneratedTags.filter((tag) => !product.tags.includes(tag)),
        ];
        return { ...product, tags: Array.from(new Set(newTags)) };
      });

    setTags(updatedProducts);
  }, [manualTags, generatedTagsMap, selectedResources]);

  if (!selectedResources.length) return <p>Select products to manage tags</p>;
  return (
    <Form method="post" onSubmit={applyTagsToProducts}>
      <input
        type="hidden"
        name="selectedProductIds"
        value={JSON.stringify(selectedResources)}
      />
      <input type="hidden" name="tags" value={JSON.stringify(Tags)} />
      <BlockStack gap="200">
        <InlineStack gap="200" blockAlign="end">
          <div style={{ marginBottom: 10, width: "100%" }}>
            <TextField
              label={`Add Tags for ${selectedResources.length} Selected Products`}
              value={newTag}
              placeholder="Enter new tag"
              onChange={setNewTag}
              autoComplete="off"
              connectedRight={
                <div style={{ display: "flex", gap: "5px" }}>
                  <Button onClick={handleAddTag} disabled={!newTag.trim()}>
                    Add
                  </Button>
                  <ButtonGroup>
                    <Button
                      onClick={handleGenerateTags}
                      disabled={!selectedResources.length}
                    >
                      Generate Tags
                    </Button>
                    <Button
                      onClick={handleClearTags}
                      variant="plain"
                      tone="critical"
                    >
                      Clear
                    </Button>
                  </ButtonGroup>
                </div>
              }
            />
            <TextContainer spacing="tight">
              <Text as="p" tone="subdued" variant="bodySm">
                Press Enter to add tags
              </Text>
            </TextContainer>
          </div>
        </InlineStack>
        {/* New Tags to Add */}
        {manualTags.length > 0 && (
          <Box padding="200">
            <Text variant="bodyMd" as="h3">
              Tags to be Added:
            </Text>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              {manualTags.map((tag) => (
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
            </div>
          </Box>
        )}
        {/* Generated tags per product (optional visual) */}
        {Object.keys(generatedTagsMap).length > 0 && (
          <Box padding="200">
            <Text variant="bodyMd" as="h3">
              Generated Tags (per product):
            </Text>
            {selectedResources.map((pid) => (
              <div key={pid} style={{ marginBottom: 8 }}>
                <Text as="span" fontWeight="bold">
                  {avalableProducts.find((p) => p.id === pid)?.title || pid}:
                </Text>
                <span style={{ marginLeft: 8 }}>
                  {(generatedTagsMap[pid] || []).map((tag) => (
                    <Badge key={tag} tone="info">
                      {tag}
                    </Badge>
                  ))}
                </span>
              </div>
            ))}
          </Box>
        )}
      </BlockStack>
      <InlineStack gap="200" blockAlign="center" align="end">
        <Button
          submit
          variant="primary"
          loading={navigation.state === "submitting"}
          disabled={!isDirty}
        >
          Apply to {selectedResources.length.toString()} Products
        </Button>
        <Button onClick={handleClearTags} variant="plain" disabled={!isDirty}>
          Cancel
        </Button>
      </InlineStack>
    </Form>
  );
}
