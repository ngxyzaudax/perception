import { SelectList } from "./select/SelectList.js";
import type { TrackedCheckpoint } from "../services/checkpoints/checkpointState.js";
import { colors } from "../ui/theme.js";

type CheckpointPickerProps = {
  checkpoints: TrackedCheckpoint[];
  onSelect: (sha: string) => void;
  onCancel: () => void;
};

export const CheckpointPicker = ({
  checkpoints,
  onSelect,
  onCancel,
}: CheckpointPickerProps): React.ReactElement => {
  const options = checkpoints.map((checkpoint) => ({
    label: `${checkpoint.label} (${checkpoint.messageCount} msgs)`,
    value: checkpoint.sha,
  }));
  return (
    <SelectList
      title="Rewind checkpoint"
      borderColor={colors.tool}
      options={options}
      onSelect={onSelect}
      onCancel={onCancel}
    />
  );
};
