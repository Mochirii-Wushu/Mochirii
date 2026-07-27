"use client";

import {
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type ImageState = "loading" | "ready" | "error";

export function LightboxImage({
  id,
  src,
  previewSrc,
  alt,
}: {
  id: string;
  src: string;
  previewSrc: string;
  alt: string;
}) {
  const [imageState, setImageState] = useState<ImageState>("loading");
  const decodeGenerationRef = useRef(0);

  useEffect(
    () => () => {
      decodeGenerationRef.current += 1;
    },
    [],
  );

  const finishDecode = async (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const generation = decodeGenerationRef.current + 1;
    decodeGenerationRef.current = generation;

    if (typeof image.decode === "function") {
      try {
        await image.decode();
      } catch {
        // A loaded image can still reject decode() after it leaves the document.
      }
    }

    if (decodeGenerationRef.current !== generation) return;
    setImageState(image.complete && image.naturalWidth > 0 ? "ready" : "error");
  };

  const markError = () => {
    decodeGenerationRef.current += 1;
    setImageState("error");
  };

  const statusMessage = imageState === "loading"
    ? "Loading full image…"
    : imageState === "error"
      ? "The full image could not be loaded."
      : "";

  return (
    <div
      className="lightbox-media"
      data-image-state={imageState}
      aria-busy={imageState === "loading"}
    >
      <img
        src={previewSrc}
        alt=""
        className="lightbox-img lightbox-img--preview"
        aria-hidden="true"
        loading="eager"
        decoding="async"
      />
      <img
        id={id}
        src={src}
        alt={alt}
        className="lightbox-img lightbox-img--full"
        decoding="async"
        fetchPriority="high"
        onLoad={finishDecode}
        onError={markError}
      />
      <span className="lightbox-image-status" role="status" aria-live="polite">
        {statusMessage}
      </span>
    </div>
  );
}
