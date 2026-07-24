export type CancelTurnTarget = {
  cancelPermissions: () => void;
  cancelQuestion: () => void;
  abortQuery: () => void;
};

export const cancelTurn = (target: CancelTurnTarget): void => {
  target.cancelPermissions();
  target.cancelQuestion();
  target.abortQuery();
};
