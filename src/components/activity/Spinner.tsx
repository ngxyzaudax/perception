import { Text } from "ink";
import { useEffect, useState } from "react";
import { symbols } from "../../ui/theme.js";

type SpinnerProps = {
  label?: string;
};

export const Spinner = ({ label }: SpinnerProps): React.ReactElement => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((current) => (current + 1) % symbols.spinner.length);
    }, 120);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return (
    <Text dimColor>
      {symbols.spinner[frame]} {label ?? ""}
    </Text>
  );
};
