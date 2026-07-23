import { useEffect, useState } from "react";
import { useSecondTick } from "../hooks/useSecondTick.js";
import { listAgentTasks, type AgentTask } from "../state/agentTasks.js";

const snapshotKey = (tasks: AgentTask[]): string =>
  tasks.map((task) => `${task.id}:${task.status}:${task.worktreeBranch ?? ""}`).join("|");

export const useAgentTasksPoll = (sessionId: string): AgentTask[] => {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const tick = useSecondTick(true);

  useEffect(() => {
    setTasks((current) => {
      const next = listAgentTasks(sessionId);
      return snapshotKey(current) === snapshotKey(next) ? current : next;
    });
  }, [sessionId, tick]);

  return tasks;
};
