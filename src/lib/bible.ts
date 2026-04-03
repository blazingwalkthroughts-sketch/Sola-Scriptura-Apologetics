export const BIBLE_TRANSLATIONS = [
  { id: 'NIV', name: 'New International Version' },
  { id: 'KJV', name: 'King James Version' },
  { id: 'ESV', name: 'English Standard Version' },
  { id: 'NASB', name: 'New American Standard Bible' },
  { id: 'NKJV', name: 'New King James Version' },
  { id: 'NLT', name: 'New Living Translation' },
  { id: 'AMP', name: 'Amplified Bible' },
  { id: 'BSB', name: 'Berean Standard Bible' },
] as const;

export type BibleTranslation = typeof BIBLE_TRANSLATIONS[number]['id'];

export function getBibleGatewayLink(reference: string, translation: string = 'NIV') {
  const encodedRef = encodeURIComponent(reference);
  const encodedVersion = encodeURIComponent(translation);
  return `https://www.biblegateway.com/passage/?search=${encodedRef}&version=${encodedVersion}`;
}

export function wrapBibleReferences(text: string, translation: string = 'NIV') {
  // Regex for Bible references: e.g., John 3:16, 1 John 1:9, Matthew 24:1-14, Genesis 1:1
  const bibleRefRegex = /(?:[1-3]\s?)?[A-Z][a-z]+\.?\s?\d+(?::\d+(?:-\d+)?)?/g;
  
  // To avoid double-wrapping, we first identify existing markdown links
  // and temporarily replace them with placeholders.
  const links: string[] = [];
  const textWithPlaceholders = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match) => {
    links.push(match);
    return `__LINK_PLACEHOLDER_${links.length - 1}__`;
  });

  // Wrap references in the text that isn't already a link
  const wrappedText = textWithPlaceholders.replace(bibleRefRegex, (match) => {
    const link = getBibleGatewayLink(match, translation);
    return `[${match}](${link})`;
  });

  // Restore the original links
  return wrappedText.replace(/__LINK_PLACEHOLDER_(\d+)__/g, (_, index) => {
    return links[parseInt(index)];
  });
}
