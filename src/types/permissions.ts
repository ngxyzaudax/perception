export type PermissionMode = "default" | "plan" | "bypassPermissions";

export type PermissionDecision =
  | { kind: "allow" }
  | { kind: "deny"; reason: string }
  | { kind: "ask"; reason?: string };

export type PermissionResult =
  | { granted: true; persistRule?: string }
  | { granted: false; reason: string };

export type PermissionRequest = {
  toolName: string;
  summary: string;
  preview?: { oldContent: string; newContent: string };
  suggestedPersistRule?: string;
  resolve: (result: PermissionResult) => void;
};
