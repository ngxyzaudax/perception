export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type ToolMessageDisplay = {
  kind: "diff";
  oldContent: string;
  newContent: string;
  filePath?: string;
};

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | {
      role: "tool";
      toolCallId: string;
      content: string;
      name: string;
      summary?: string;
      display?: ToolMessageDisplay;
      isError?: boolean;
    };

export type QueryEvent =
  | { type: "text_delta"; text: string }
  | { type: "reasoning_delta"; text: string }
  | { type: "message_complete"; message: ChatMessage }
  | { type: "tool_start"; name: string; input: unknown }
  | { type: "tool_end"; name: string; output: string; isError: boolean }
  | { type: "tool_call_delta"; name: string; argsPreview: string }
  | { type: "tool_progress"; name: string; elapsedMs: number }
  | { type: "permission_request"; toolName: string; summary: string }
  | { type: "done" }
  | { type: "status"; message: string }
  | { type: "error"; message: string }
  | { type: "usage"; promptTokens: number; completionTokens: number; tokensPerSecond: number };
