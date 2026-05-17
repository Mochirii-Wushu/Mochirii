"use client";

import { useEffect } from "react";

export function BodyPageMarker({ page }: { page: string }) {
  useEffect(() => {
    document.body.dataset.page = page;
  }, [page]);

  return null;
}
