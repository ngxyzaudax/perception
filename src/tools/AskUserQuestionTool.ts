import { z } from "zod";
import { buildTool } from "../Tool.js";

const optionSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
});

const inputSchema = z.object({
  question: z.string().describe("Question to ask the user"),
  options: z.array(optionSchema).min(2).describe("Selectable options"),
});

export const AskUserQuestionTool = buildTool({
  name: "AskUserQuestion",
  description: "Ask the user a multiple-choice question and wait for an answer",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => input.question,
  call: async (input, context) => {
    if (!context.runtime?.requestQuestion) {
      return "Question prompt unavailable in this runtime";
    }
    const labels = input.options.map((option) => option.label);
    const answer = await context.runtime.requestQuestion(input.question, labels);
    return `User selected: ${answer}`;
  },
});
