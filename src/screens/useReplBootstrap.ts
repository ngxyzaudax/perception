import { useEffect } from "react";
import { runHookEvent } from "../services/hooks/runHooks.js";
import { loadHooksConfig } from "../services/hooks/loadHooks.js";
import type { HooksConfig } from "../services/hooks/hookSchema.js";
import { connectMcpTools, closeMcpConnections, formatMcpStatus } from "../services/mcp/mcpManager.js";
import { createLlmClient, resolveModel } from "../services/llm/client.js";
import type { Settings } from "../schemas/settings.js";
import { refreshAgents } from "../tools/AgentTool.js";
import { refreshSkills } from "../tools/SkillTool.js";
import { createToolRegistry } from "../tools.js";
import type { ToolRegistry } from "../Tool.js";
import type { SkillDefinition } from "../skills/skillSchema.js";
import type { DisplayMessage } from "../types/displayMessages.js";
import { cleanupStaleWorktrees } from "../services/worktrees/cleanupStaleWorktrees.js";
import { startCronScheduler, stopCronScheduler } from "../services/cron/cronScheduler.js";
import { shutdownLspClients } from "../services/lsp/lspManager.js";
import { getCwd } from "../utils/cwd.js";
import { setActiveSessionId } from "../state/backgroundTasks.js";
import { appendStatus } from "./displayState.js";
import type { SessionController } from "./replSession.js";

type BootstrapArgs = {
  liveSettings: Settings;
  session: SessionController;
  setHooksConfig: (config: HooksConfig) => void;
  setSkills: (skills: SkillDefinition[]) => void;
  setRegistry: (registry: ToolRegistry) => void;
  setModel: (model: string) => void;
  setMaxContextTokens: (tokens: number) => void;
  setDisplayMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
};

export const useReplBootstrap = ({
  liveSettings,
  session,
  setHooksConfig,
  setSkills,
  setRegistry,
  setModel,
  setMaxContextTokens,
  setDisplayMessages,
}: BootstrapArgs): void => {
  useEffect(() => {
    setActiveSessionId(session.getSessionId());
    void resolveModel(createLlmClient(liveSettings), liveSettings.model).then((resolved) => {
      setModel(resolved.modelId);
      setMaxContextTokens(resolved.maxContextTokens);
    });
    void refreshSkills().then(setSkills);
    void refreshAgents();
    void cleanupStaleWorktrees();
    startCronScheduler();
    void loadHooksConfig().then(async (hooks) => {
      setHooksConfig(hooks);
      const started = await runHookEvent(hooks, { event: "SessionStart", cwd: getCwd() });
      if (started.allowed && started.context) {
        setDisplayMessages((current) => appendStatus(current, started.context ?? "", "Session"));
      }
    });
    void connectMcpTools().then(({ tools, statuses }) => {
      setRegistry(createToolRegistry(tools));
      if (statuses.length > 0) {
        setDisplayMessages((current) => appendStatus(current, formatMcpStatus(statuses), "MCP"));
      }
    });
    return () => {
      stopCronScheduler();
      void shutdownLspClients();
      void closeMcpConnections();
    };
  }, [liveSettings, session, setDisplayMessages, setHooksConfig, setMaxContextTokens, setModel, setRegistry, setSkills]);
};
