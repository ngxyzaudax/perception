import { estimatePromptTokens, shouldAutoCompact } from "../services/compact/autoCompact.js";
import { compactConversation } from "../services/compact/compactConversation.js";
import { createCheckpoint } from "../services/checkpoints/shadowRepo.js";
import { recordCheckpoint } from "../services/checkpoints/checkpointState.js";
import { expandSkill, matchSkillCommand } from "../skills/loadSkills.js";
import { startAgent } from "../services/agents/agentLifecycle.js";
import { getUsage } from "../state/usage.js";
import type { ChatMessage } from "../types/messages.js";
import { expandFileMentions } from "../utils/fileMentions.js";
import { getCwd } from "../utils/cwd.js";
import { runHookEvent } from "../services/hooks/runHooks.js";
import type { SlashActionContext, SlashActionResult } from "./slashActionTypes.js";

const startSkillAgent = async (
  context: SlashActionContext,
  skillName: string,
  prompt: string,
  model?: string,
): Promise<SlashActionResult> => {
  const message = await startAgent({
    description: `skill: ${skillName}`,
    prompt,
    runtime: {
      settings: context.settings,
      registry: context.registry,
      permissionContext: context.permissionContext,
      onEvent: () => undefined,
      sessionId: context.session.getSessionId(),
      hooksConfig: context.hooksConfig,
    },
    signal: new AbortController().signal,
    model,
    runInBackground: true,
  });
  return { type: "status", content: message, title: "Skill" };
};

const scheduleCheckpoint = (label: string, messageCount: number): void => {
  void createCheckpoint(label)
    .then((checkpoint) => {
      if (checkpoint) {
        recordCheckpoint(checkpoint, messageCount);
      }
    })
    .catch(() => {});
};

export const runUserPromptAction = async (
  context: SlashActionContext,
): Promise<SlashActionResult> => {
  const skillMatch = matchSkillCommand(context.input, context.skills);
  if (skillMatch) {
    const prompt = `[Skill: ${skillMatch.skill.name}]\n${expandSkill(skillMatch.skill, skillMatch.args)}`;
    if (skillMatch.skill.runAsAgent) {
      return startSkillAgent(context, skillMatch.skill.name, prompt, skillMatch.skill.model);
    }
    const nextMessages: ChatMessage[] = [...context.messages, { role: "user", content: prompt }];
    return { type: "skill", prompt, messages: nextMessages, skill: skillMatch.skill };
  }
  const promptHook = await runHookEvent(context.hooksConfig, {
    event: "UserPromptSubmit",
    prompt: context.input,
    cwd: getCwd(),
  });
  if (!promptHook.allowed) {
    return { type: "status", content: promptHook.reason ?? "prompt blocked", title: "Blocked" };
  }
  const expanded = await expandFileMentions(context.input, getCwd());
  const promptBody =
    promptHook.allowed && promptHook.context
      ? `${promptHook.context}\n\n${expanded.prompt}`
      : expanded.prompt;
  const attachmentBlock =
    expanded.attachments.length > 0 ? expanded.attachments.join("\n\n") : "";
  const userContent = attachmentBlock ? `${promptBody}\n\n${attachmentBlock}` : promptBody;
  const userMessage: ChatMessage = { role: "user", content: userContent };
  let queryMessages: ChatMessage[] = [...context.messages, userMessage];
  if (
    context.messages.length > 0 &&
    shouldAutoCompact(
      estimatePromptTokens(getUsage().lastPromptTokens, context.messages),
      context.maxContextTokens,
    )
  ) {
    const compacted = await compactConversation(context.settings, context.messages);
    queryMessages = [...compacted, userMessage];
    context.session.persistSession(compacted);
  }
  scheduleCheckpoint(context.input.slice(0, 40), context.messages.length);
  return { type: "query", messages: queryMessages };
};
