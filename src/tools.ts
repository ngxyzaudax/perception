import { AgentTool } from "./tools/AgentTool.js";
import { AskUserQuestionTool } from "./tools/AskUserQuestionTool.js";
import { BashTool } from "./tools/BashTool.js";
import { ConfigTool } from "./tools/ConfigTool.js";
import { CronCreateTool } from "./tools/CronCreateTool.js";
import { CronDeleteTool } from "./tools/CronDeleteTool.js";
import { CronListTool } from "./tools/CronListTool.js";
import { EnterPlanModeTool } from "./tools/EnterPlanModeTool.js";
import { ExitPlanModeTool } from "./tools/ExitPlanModeTool.js";
import { FileEditTool } from "./tools/FileEditTool.js";
import { FileReadTool } from "./tools/FileReadTool.js";
import { FileWriteTool } from "./tools/FileWriteTool.js";
import { GlobTool } from "./tools/GlobTool.js";
import { GrepTool } from "./tools/GrepTool.js";
import { ListMcpResourcesTool } from "./tools/ListMcpResourcesTool.js";
import { LspTool } from "./tools/LspTool.js";
import { ReadMcpResourceTool } from "./tools/ReadMcpResourceTool.js";
import { REPLTool } from "./tools/REPLTool.js";
import { SendMessageTool } from "./tools/SendMessageTool.js";
import { SkillTool } from "./tools/SkillTool.js";
import { NotebookEditTool } from "./tools/NotebookEditTool.js";
import { SleepTool } from "./tools/SleepTool.js";
import { TaskCreateTool } from "./tools/TaskCreateTool.js";
import { TaskGetTool } from "./tools/TaskGetTool.js";
import { TaskListTool } from "./tools/TaskListTool.js";
import { TaskOutputTool } from "./tools/TaskOutputTool.js";
import { TaskStopTool } from "./tools/TaskStopTool.js";
import { TaskUpdateTool } from "./tools/TaskUpdateTool.js";
import { TeamCreateTool } from "./tools/TeamCreateTool.js";
import { TeamDeleteTool } from "./tools/TeamDeleteTool.js";
import { TodoWriteTool } from "./tools/TodoWriteTool.js";
import { WebFetchTool } from "./tools/WebFetchTool.js";
import { WebSearchTool } from "./tools/WebSearchTool.js";
import type { AnyToolDefinition, ToolRegistry } from "./Tool.js";

const sharedTools = [
  BashTool,
  FileReadTool,
  FileWriteTool,
  FileEditTool,
  NotebookEditTool,
  GlobTool,
  GrepTool,
  TodoWriteTool,
  WebFetchTool,
  WebSearchTool,
  SkillTool,
  ListMcpResourcesTool,
  ReadMcpResourceTool,
  TaskOutputTool,
  TaskStopTool,
  SendMessageTool,
  EnterPlanModeTool,
  ExitPlanModeTool,
  AskUserQuestionTool,
  SleepTool,
  REPLTool,
  LspTool,
  TaskCreateTool,
  TaskUpdateTool,
  TaskGetTool,
  TaskListTool,
];

const mainOnlyTools = [ConfigTool, CronCreateTool, CronDeleteTool, CronListTool];

const coordinatorTools = [TeamCreateTool, TeamDeleteTool];

export const createToolRegistry = (extraTools: AnyToolDefinition[] = []): ToolRegistry =>
  Object.fromEntries(
    [...sharedTools, ...mainOnlyTools, AgentTool, ...coordinatorTools, ...extraTools].map(
      (tool) => [tool.name, tool],
    ),
  );

export const createSubAgentRegistry = (extraTools: AnyToolDefinition[] = []): ToolRegistry =>
  Object.fromEntries([...sharedTools, ...extraTools].map((tool) => [tool.name, tool]));

export const getCoreTools = (): typeof sharedTools => sharedTools;
