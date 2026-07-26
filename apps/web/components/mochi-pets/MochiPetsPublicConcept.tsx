import Image from "next/image";
import { MochiPetsArrivalScene } from "./MochiPetsArrivalScene";

export function MochiPetsPublicConcept() {
  return (
    <section className="mochi-game-shell mochi-game-shell--concept" aria-labelledby="mochi-pets-title">
      <MochiPetsArrivalScene publicOnly />
      <header className="mochi-game-status">
        <div className="mochi-game-status__copy">
          <div className="mochi-game-brand">
            <Image
              src="/assets/img/brand/emblem.webp"
              alt=""
              aria-hidden="true"
              width={48}
              height={48}
              sizes="48px"
            />
            <p className="eyebrow">Mōchirīī Guild World</p>
          </div>
          <h1 id="mochi-pets-title">Mochi Pets</h1>
          <p>
            A shared 3D guild home beyond the Jianghu, bringing Mochirii members together with a Mochi companion of their own across iPhone and desktop.
          </p>
        </div>
      </header>
    </section>
  );
}
