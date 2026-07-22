import { SelectList } from "./select/SelectList.js";
import type { SessionMetadata } from "../services/sessions/sessionSchema.js";
import { colors } from "../ui/theme.js";

type SessionPickerProps = {
  sessions: SessionMetadata[];
  onSelect: (sessionId: string) => void;
  onCancel: () => void;
};

export const SessionPicker = ({
  sessions,
  onSelect,
  onCancel,
}: SessionPickerProps): React.ReactElement => {
  const options = sessions.map((session) => ({
    label: `${session.title} (${session.messageCount} msgs, ${formatRelativeTime(session.updatedAt)})`,
    value: session.id,
  }));
  return (
    <SelectList
      title="Resume session"
      borderColor={colors.accent}
      options={options}
      onSelect={onSelect}
      onCancel={onCancel}
    />
  );
};

const formatRelativeTime = (iso: string): string => {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
};
