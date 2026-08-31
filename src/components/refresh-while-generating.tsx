"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Reloads the confirmation page until story and pictures finish. */
export function RefreshWhileGenerating() {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, 2500);
    return () => window.clearInterval(id);
  }, [router]);

  return null;
}
