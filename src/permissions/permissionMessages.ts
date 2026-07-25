export const USER_PERMISSION_DENIED = "user denied permission";

export const PERMISSION_CANCELLED = "permission cancelled";

export const REJECT_MESSAGE =
  "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.";

export const REJECT_MESSAGE_WITH_REASON_PREFIX =
  "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). To tell you how to proceed, the user said:\n";

export const isUserPermissionRejectContent = (content: string): boolean =>
  content === REJECT_MESSAGE || content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX);

export const formatUserPermissionReject = (feedback?: string): string => {
  const trimmed = feedback?.trim();
  if (trimmed && trimmed.length > 0 && trimmed !== USER_PERMISSION_DENIED) {
    return `${REJECT_MESSAGE_WITH_REASON_PREFIX}${trimmed}`;
  }
  return REJECT_MESSAGE;
};
