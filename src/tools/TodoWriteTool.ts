import { z } from "zod";
import { buildTool } from "../Tool.js";
import { formatTodos, setTodos } from "../state/todos.js";

const inputSchema = z.object({
  todos: z
    .array(
      z.object({
        id: z.string().describe("Unique identifier for the todo"),
        content: z.string().describe("Description of the task"),
        status: z
          .enum(["pending", "in_progress", "completed"])
          .describe("Current status"),
      }),
    )
    .describe("Full replacement list of todos"),
});

export const TodoWriteTool = buildTool({
  name: "TodoWrite",
  description:
    "Replace the session todo list. Use to plan multi-step work and track progress.",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => `${input.todos.length} todos`,
  call: async (input) => formatTodos(setTodos(input.todos)),
});
