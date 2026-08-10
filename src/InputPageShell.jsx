import InputPage from "./InputPage";
import { useAccessWarning } from "./useAccessWarning";

export default function InputPageShell() {
  const { renderAccessWarning } = useAccessWarning();

  return <InputPage accessWarningContent={renderAccessWarning(false)} />;
}
