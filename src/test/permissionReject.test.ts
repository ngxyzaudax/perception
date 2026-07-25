import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatUserPermissionReject,
  isUserPermissionRejectContent,
  REJECT_MESSAGE,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
} from "../permissions/permissionMessages.js";

describe("permission reject messages", () => {
  it("formats stop-and-wait message without feedback", () => {
    assert.equal(formatUserPermissionReject(), REJECT_MESSAGE);
    assert.equal(isUserPermissionRejectContent(REJECT_MESSAGE), true);
  });

  it("formats reject message with user guidance", () => {
    const content = formatUserPermissionReject("use git status instead");
    assert.ok(content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX));
    assert.match(content, /git status/);
    assert.equal(isUserPermissionRejectContent(content), true);
  });
});
