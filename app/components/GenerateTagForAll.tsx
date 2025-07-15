import { Form, useNavigation } from "@remix-run/react";
import {
  Button,
  Card,
  TextField,
  Text,
  ButtonGroup,
  Box,
  Tag,
  InlineStack,
  BlockStack,
} from "@shopify/polaris";
import { useCallback, useState, useEffect, useRef } from "react";

type Product = { id: string; title: string; tags: string[] };

export default function GenerateTagForAll({
  selectedResources,
  avalableProducts,
  onTagsUpdated,
  useTags: { tags, setTags },
}: {
  selectedResources: string[];
  avalableProducts: Product[];
  onTagsUpdated: (updatedProducts: Product[]) => void;
  useTags: any;
  
}) {
  const navigation = useNavigation();
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [generatedTagsMap, setGeneratedTagsMap] = useState<
    Record<string, string[]>
  >({});
  const [newTag, setNewTag] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [tagInputError, setTagInputError] = useState("");
  // Track selected IDs in a ref to detect changes
  const prevSelectedRef = useRef<string[]>([]);

  // Update isDirty whenever manualTags or generatedTagsMap changes
  useEffect(() => {
    const hasManualTags = manualTags.length > 0;
    const hasGeneratedTags = Object.keys(generatedTagsMap).length > 0;
    setIsDirty(hasManualTags || hasGeneratedTags);
  }, [manualTags, generatedTagsMap]);

  useEffect(() => {
    const updatedMap: Record<string, string[]> = {};
    selectedResources.forEach((id) => {
      if (generatedTagsMap[id]) updatedMap[id] = generatedTagsMap[id];
    });
    setGeneratedTagsMap(updatedMap);
    prevSelectedRef.current = selectedResources;
  }, [selectedResources]);

  const handleAddTag = useCallback(() => {
    if (!newTag.trim()) {
      setTagInputError("Tag cannot be empty");
      return;
    }

    if (manualTags.includes(newTag.trim())) {
      setTagInputError("Tag already exists");
      return;
    }

    setManualTags((prev) => [...prev, newTag.trim()]);
    setNewTag("");
    setTagInputError("");
  }, [newTag, manualTags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setManualTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  }, []);

  const handleGenerateTags = useCallback(() => {
    const newGenerated: Record<string, string[]> = {};
    avalableProducts.forEach((product) => {
      if (selectedResources.includes(product.id)) {
        const cleanedTitle = product.title
          .replace(/[′'""“”‘’`]/g, "")
          .toLowerCase();
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

        newGenerated[product.id] = Array.from(
          new Set([...baseTags, ...sizeTags]),
        );
      }
    });
    setGeneratedTagsMap(newGenerated);
  }, [avalableProducts, selectedResources]);

  const handleClearTags = useCallback(() => {
    setManualTags([]);
    setGeneratedTagsMap({});
  }, []);

  const applyTagsToProducts = useCallback(
    (e: React.FormEvent) => {
      const updatedProducts = avalableProducts
        .filter((p) => selectedResources.includes(p.id))
        .map((product) => {
          const productGeneratedTags = generatedTagsMap[product.id] ?? [];
          const newTags = [
            ...product.tags,
            ...manualTags.filter((tag) => !product.tags.includes(tag)),
            ...productGeneratedTags.filter(
              (tag) => !product.tags.includes(tag),
            ),
          ];
          return { ...product, tags: Array.from(new Set(newTags)) };
        });

      setTags(updatedProducts);
      setIsDirty(false);
      onTagsUpdated(updatedProducts);
    },
    [
      avalableProducts,
      selectedResources,
      generatedTagsMap,
      manualTags,
      onTagsUpdated,
    ],
  );

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
  }, [manualTags, generatedTagsMap, selectedResources, avalableProducts]);

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Form method="post" onSubmit={applyTagsToProducts}>
      <input
        type="hidden"
        name="selectedProductIds"
        value={JSON.stringify(selectedResources)}
      />
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />

      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <div onKeyDown={handleTagInputKeyDown}>
              <TextField
                label={`Add tags to selected products`}
                value={newTag}
                placeholder="Enter new tag"
                onChange={setNewTag}
                autoComplete="off"
                error={tagInputError}
              />
            </div>
            <Text as="p" tone="subdued" variant="bodySm">
              Press enter to add tags
            </Text>
          </BlockStack>
        </Card>

        {manualTags.length > 0 && (
          <Card>
            <BlockStack gap="200">
              {manualTags.length > 0 && (
                <Box paddingBlockEnd="200">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text variant="bodyMd" as="h3" fontWeight="semibold">
                      Added Tags
                    </Text>
                    <Button
                      onClick={() => {
                        setManualTags([]);
                      }}
                      disabled={
                        !manualTags.length &&
                        !Object.keys(generatedTagsMap).length
                      }
                      variant="plain"
                    >
                      Clear Tags
                    </Button>
                  </div>

                  <Box paddingBlockStart="200">
                    <InlineStack gap="100" wrap>
                      {manualTags.map((tag) => (
                        <Tag key={tag} onRemove={() => handleRemoveTag(tag)}>
                          {tag}
                        </Tag>
                      ))}
                    </InlineStack>
                  </Box>
                </Box>
              )}
            </BlockStack>
          </Card>
        )}

        <InlineStack align="space-between" gap="200">
          <Button
            onClick={handleGenerateTags}
            disabled={!selectedResources.length}
            variant="primary"
          >
            Auto Generate
          </Button>
          <ButtonGroup>
            <Button
              onClick={handleClearTags}
              tone="critical"
              disabled={!isDirty}
            >
              Remove Changes
            </Button>
            <Button
              submit
              variant="primary"

              loading={navigation.state === "submitting"}
              disabled={!isDirty || !selectedResources.length}
            >
              Save
            </Button>
          </ButtonGroup>
        </InlineStack>
      </BlockStack>
    </Form>
  );
}
