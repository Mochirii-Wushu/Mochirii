"use client";

import dynamic from "next/dynamic";
import { MochiPetsPublicConcept } from "./MochiPetsPublicConcept";

const PrivateDoorway = dynamic(
  () => import("./MochiPetsPrivateDoorway").then((module) => module.MochiPetsPrivateDoorway),
  { loading: () => <MochiPetsPublicConcept /> },
);

export function MochiPetsConfiguredDoorway() {
  return <PrivateDoorway />;
}
