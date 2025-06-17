import {useState } from "react";

export const newGenerateTags = (title: string, currentTags: string[]) => {
    const [generatedTags, setGeneratedTags] = useState<string[]>([]);
    const allTags = [...new Set([...currentTags, ...generatedTags])];
    const cleanedTitle = title
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

    return generatedTags;
};
