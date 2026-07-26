import Image from "next/image";
import type { SpinnerAccessMode } from "@/lib/spinner/session-policy";
import { SpinnerClientEntry } from "./SpinnerClientEntry";
import { SpinnerSessionGuard } from "./SpinnerSessionGuard";

export function SpinnerStage({ mode }: { mode: SpinnerAccessMode }) {
  return (
    <div className="spinner-page" id="spinner-page">
      <div className="raffle-page">
        <div className="scene scene-mountains" aria-hidden="true" />
        <div className="scene scene-banner" aria-hidden="true">
          <Image
            src="/assets/img/spinner/mochirii-banner.webp"
            alt=""
            fill
            priority
            sizes="100vw"
          />
        </div>
        <div className="scene scene-vignette" aria-hidden="true" />
        <SpinnerSessionGuard mode={mode}>
          <SpinnerClientEntry mode={mode} />
        </SpinnerSessionGuard>
      </div>
    </div>
  );
}
