export type PermissionMode = "default" | "plan" | "bypassPermissions";

export type PermissionResult =
  | { granted: true; persistRule?: string }
  | { granted: false; reason: string };

export type PermissionRequest = {
  toolName: string;
  summary: string;
  preview?: { oldContent: string; newContent: string };
  resolve: (result: PermissionResult) => void;
};
