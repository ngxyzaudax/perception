import OpenAI from "openai";
import type { Settings } from "../../schemas/settings.js";

export const createLlmClient = (settings: Settings): OpenAI =>
  new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.baseUrl,
  });

export type ResolvedModel = {
  modelId: string;
  maxContextTokens: number;
};

type ModelEntry = {
  id: string;
  max_model_len?: number;
};

export const resolveModel = async (
  client: OpenAI,
  preferred?: string,
): Promise<ResolvedModel> => {
  const response = await client.models.list();
  const models = response.data as ModelEntry[];
  const selected = preferred
    ? models.find((entry) => entry.id === preferred) ?? models[0]
    : models[0];
  if (!selected) {
    throw new Error("No models available from vLLM");
  }
  return {
    modelId: selected.id,
    maxContextTokens: selected.max_model_len ?? 128000,
  };
};

export const resolveModelId = async (
  client: OpenAI,
  preferred?: string,
): Promise<string> => (await resolveModel(client, preferred)).modelId;
