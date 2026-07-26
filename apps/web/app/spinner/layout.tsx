import type { Metadata } from "next";
import type { ReactNode } from "react";

const PRIVATE_ROBOTS = {
  index: false,
  follow: false,
  nocache: true,
  noarchive: true,
  nosnippet: true,
  noimageindex: true,
} as const;

export const metadata: Metadata = {
  title: "Page unavailable",
  description: "Page unavailable.",
  alternates: { canonical: null },
  robots: PRIVATE_ROBOTS,
  openGraph: null,
  twitter: null,
  icons: { icon: [], apple: [] },
};

export default function SpinnerLayout({ children }: { children: ReactNode }) {
  return children;
}
