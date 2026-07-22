import { Box, Text } from "ink";
import { useEffect, useState } from "react";
import type { AgentTask } from "../../state/agentTasks.js";
import { colors, symbols } from "../../ui/theme.js";
import { formatDuration } from "../../ui/formatDuration.js";

type AgentsPanelProps = {
  tasks: AgentTask[];
};

const truncate = (value: string, maxLength: number): string =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;

const agentLabel = (task: AgentTask): string => task.name ?? task.id;

const elapsedSince = (startedAt: string, now: number): number =>
  Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));

export const AgentsPanel = ({ tasks }: AgentsPanelProps): React.ReactElement | null => {
  const running = tasks.filter((task) => task.status === "running");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (running.length === 0) {
      return;
    }
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [running.length]);

  if (running.length === 0) {
    return null;
  }
  const visible = running.slice(0, 5);
  return (
    <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor={colors.border} paddingX={1}>
      <Text bold color={colors.accent}>
        agents ({running.length} running)
      </Text>
      {visible.map((task) => (
        <Text key={task.id}>
          <Text color={colors.success}>{symbols.bullet} </Text>
          <Text bold>{agentLabel(task)}</Text>
          <Text dimColor> {formatDuration(elapsedSince(task.startedAt, now))}</Text>
          {task.worktreeBranch ? <Text color={colors.highlight}> {task.worktreeBranch}</Text> : null}
          <Text dimColor> {truncate(task.description, 60)}</Text>
        </Text>
      ))}
      {running.length > visible.length ? (
        <Text dimColor>... +{running.length - visible.length} more</Text>
      ) : null}
    </Box>
  );
};
