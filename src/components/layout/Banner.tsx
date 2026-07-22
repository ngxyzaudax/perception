import { Box, Text } from "ink";
import { colors, symbols } from "../../ui/theme.js";

type BannerProps = {
  cwd: string;
  version: string;
};

const shortenPath = (path: string): string => {
  const home = process.env.HOME ?? "";
  return home.length > 0 && path.startsWith(home) ? `~${path.slice(home.length)}` : path;
};

export const Banner = ({ cwd, version }: BannerProps): React.ReactElement => (
  <Box
    flexDirection="column"
    marginBottom={1}
    borderStyle="round"
    borderColor={colors.accent}
    paddingX={1}
  >
    <Text bold color={colors.accent}>
      {symbols.bullet} Perception <Text dimColor>v{version}</Text>
    </Text>
    <Text dimColor>
      cwd <Text color={colors.highlight}>{shortenPath(cwd)}</Text>
    </Text>
  </Box>
);
