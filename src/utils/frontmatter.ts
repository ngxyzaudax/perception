export type FrontmatterDocument = {
  frontmatter: Record<string, string>;
  body: string;
};

export const parseFrontmatter = (content: string): FrontmatterDocument => {
  if (!content.startsWith("---\n")) {
    return { frontmatter: {}, body: content };
  }
  const closing = content.indexOf("\n---\n", 4);
  if (closing === -1) {
    return { frontmatter: {}, body: content };
  }
  const rawFrontmatter = content.slice(4, closing);
  const body = content.slice(closing + 5);
  return { frontmatter: parseYamlMap(rawFrontmatter), body: body.trim() };
};

const parseYamlMap = (raw: string): Record<string, string> =>
  Object.fromEntries(
    raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.includes(":"))
      .map((line) => {
        const separator = line.indexOf(":");
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim();
        return [key, stripQuotes(value)] as const;
      }),
  );

const stripQuotes = (value: string): string =>
  value.replace(/^['"]|['"]$/g, "");
