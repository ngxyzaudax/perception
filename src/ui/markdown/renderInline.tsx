import { highlight, supportsLanguage } from "cli-highlight";
import { marked } from "marked";
import { Text } from "ink";
import type { ReactElement } from "react";

type InlineToken = {
  type: "text" | "bold" | "italic" | "code";
  value: string;
};

export const parseInlineTokens = (text: string): InlineToken[] => {
  const tokens: InlineToken[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith("**")) {
      tokens.push({ type: "bold", value: token.slice(2, -2) });
    } else if (token.startsWith("*")) {
      tokens.push({ type: "italic", value: token.slice(1, -1) });
    } else {
      tokens.push({ type: "code", value: token.slice(1, -1) });
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }
  return tokens;
};

export const renderInline = (text: string): ReactElement => (
  <Text wrap="wrap">
    {parseInlineTokens(text).map((token, index) => {
      if (token.type === "bold") {
        return (
          <Text key={index} bold>
            {token.value}
          </Text>
        );
      }
      if (token.type === "italic") {
        return (
          <Text key={index} italic>
            {token.value}
          </Text>
        );
      }
      if (token.type === "code") {
        return (
          <Text key={index} color="cyan">
            {token.value}
          </Text>
        );
      }
      return <Text key={index}>{token.value}</Text>;
    })}
  </Text>
);

export const highlightCode = (code: string, language?: string): string => {
  const lang = language && supportsLanguage(language) ? language : "plaintext";
  try {
    return highlight(code, { language: lang, ignoreIllegals: true });
  } catch {
    return code;
  }
};

export const tokenizeMarkdown = (source: string): BlockToken[] => {
  return marked.lexer(source) as BlockToken[];
};

type BlockToken = {
  type: string;
  text?: string;
  lang?: string;
  depth?: number;
  items?: Array<{ text: string }>;
  tokens?: BlockToken[];
  raw?: string;
};
