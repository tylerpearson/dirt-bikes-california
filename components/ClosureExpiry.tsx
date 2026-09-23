"use client";

import { useEffect } from "react";
import { hasLapsed, todayPacific } from "@/lib/today";

/**
 * The site is a static export, so closures are filtered at build time and a
 * page can outlive an order's end date by weeks. This hides every element
 * marked `data-closure-through="YYYY-MM-DD"` once that date has passed in the
 * viewer's browser, so a lapsed closure stops showing without a redeploy.
 * Renders nothing.
 */
export function ClosureExpiry() {
  useEffect(() => {
    const today = todayPacific();
    document
      .querySelectorAll<HTMLElement>("[data-closure-through]")
      .forEach((el) => {
        if (hasLapsed(el.dataset.closureThrough, today)) el.style.display = "none";
      });
  }, []);
  return null;
}
