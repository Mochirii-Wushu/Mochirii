import { SpinnerStage } from "@/components/spinner/SpinnerStage";
import type { SpinnerAccessMode } from "@/lib/spinner/session-policy";
import { preinit } from "react-dom";

export function AuthorizedSpinnerStage({ mode }: { mode: SpinnerAccessMode }) {
  preinit("/assets/css/member-spinner.css", { as: "style", precedence: "spinner" });
  return <SpinnerStage mode={mode} />;
}
