"use client";

import { useState } from "react";
import { DISCORD_INVITE_URL } from "@/lib/public-urls";

const previewId = "joinDiscordServerPreview";

export function DiscordServerPreview() {
  const [previewVisible, setPreviewVisible] = useState(false);

  return (
    <div className="join-discord-widget" aria-label="Mōchirīī Discord server">
      <div className="join-discord-widget__placeholder">
        <p className="muted">Open Discord directly, or load the optional server preview here.</p>
        <div className="join-discord-widget__actions">
          <button
            className="join-discord-widget__button"
            type="button"
            aria-controls={previewId}
            aria-expanded={previewVisible}
            onClick={() => setPreviewVisible((current) => !current)}
          >
            {previewVisible ? "Hide server preview" : "Show server preview"}
          </button>
          <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
            Open Discord
          </a>
        </div>
      </div>

      {previewVisible ? (
        <div className="join-discord-widget__frame" id={previewId}>
          <iframe
            title="Mōchirīī Discord server preview"
            src="https://discord.com/widget?id=1078630751077142608&theme=dark"
            width="350"
            height="500"
            loading="lazy"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          />
        </div>
      ) : null}
    </div>
  );
}
