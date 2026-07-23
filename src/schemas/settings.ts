import { z } from "zod";

import { hooksConfigSchema } from "../services/hooks/hookSchema.js";

const lspServerSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  extensionToLanguage: z.record(z.string()),
});

const defaultSearxMirrors = ["http://localhost:8080"] as const;

export const settingsSchema = z.object({
  baseUrl: z.string().url().default("http://localhost:8000/v1"),
  model: z.string().optional(),
  apiKey: z.string().default("local"),
  permissionMode: z
    .enum(["default", "plan", "bypassPermissions"])
    .default("default"),
  alwaysAllowRules: z.array(z.string()).default([]),
  denyRules: z.array(z.string()).default([]),
  askRules: z.array(z.string()).default([]),
  allowedDomains: z.array(z.string()).default([]),
  additionalDirectories: z.array(z.string()).default([]),
  webSearchUrls: z.array(z.string().url()).default([...defaultSearxMirrors]),
  memoryExtraction: z.boolean().default(false),
  hooks: hooksConfigSchema.optional().default({}),
  lspServers: z.record(lspServerSchema).optional().default({}),
});

export type Settings = z.infer<typeof settingsSchema>;
