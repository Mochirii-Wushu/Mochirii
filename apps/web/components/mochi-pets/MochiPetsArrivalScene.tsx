import Image from "next/image";

export function MochiPetsArrivalScene({ publicOnly = false }: { publicOnly?: boolean }) {
  return (
    <div className="mochi-arrival-scene" aria-hidden="true">
      <Image
        className="mochi-arrival-scene__image"
        src="/assets/img/mochi-pets/gate-arrival.webp"
        alt=""
        fill
        preload
        sizes="(max-width: 980px) calc(100vw - 48px), 38vw"
      />
      <div className="mochi-arrival-scene__caption">
        <span>{publicOnly ? "Mōchirīī Guild World" : "Guild arrival"}</span>
        <strong>{publicOnly ? "Mochi Pets" : "Mochi Pets tester doorway"}</strong>
      </div>
    </div>
  );
}
