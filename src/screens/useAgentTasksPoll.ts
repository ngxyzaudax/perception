import { useEffect, useState } from "react";
import { listAgentTasks, type AgentTask } from "../state/agentTasks.js";

const snapshotKey = (tasks: AgentTask[]): string =>
  tasks.map((task) => `${task.id}:${task.status}:${task.worktreeBranch ?? ""}`).join("|");

export const useAgentTasksPoll = (sessionId: string, intervalMs: number = 1000): AgentTask[] => {
  const [tasks, setTasks] = useState<AgentTask[]>([]);

  useEffect(() => {
    const poll = (): void => {
      setTasks((current) => {
        const next = listAgentTasks(sessionId);
        return snapshotKey(current) === snapshotKey(next) ? current : next;
      });
    };
    poll();
    const timer = setInterval(poll, intervalMs);
    return () => {
      clearInterval(timer);
    };
  }, [sessionId, intervalMs]);

  return tasks;
};
