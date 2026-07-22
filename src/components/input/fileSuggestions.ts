import fg from "fast-glob";
import { getCwd } from "../../utils/cwd.js";

export type FileSuggestion = {
  path: string;
  label: string;
};

export const searchFileSuggestions = async (query: string): Promise<FileSuggestion[]> => {
  const pattern = query.length > 0 ? `**/*${query}*` : "**/*";
  const paths = await fg(pattern, {
    cwd: getCwd(),
    dot: false,
    onlyFiles: true,
    ignore: ["**/node_modules/**", "**/.git/**"],
  });
  return paths.slice(0, 8).map((path) => ({
    path,
    label: path,
  }));
};

export const filterFileSuggestions = (
  suggestions: FileSuggestion[],
  token: string,
): FileSuggestion[] => {
  const query = token.slice(1).toLowerCase();
  if (query.length === 0) {
    return suggestions;
  }
  return suggestions.filter((entry) => entry.path.toLowerCase().includes(query));
};
