import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Page not found | Mōchirīī",
  description: "We couldn't find this page.",
  alternates: { canonical: null },
};

export default function CatchAllNotFound() {
  notFound();
}
