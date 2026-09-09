"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { setTidalEnabled, startTidal, stopTidal } from "@/lib/tidal";

/**
 * Mounts the tidal-text system and gates it on the route.
 *
 * Rendered only on the field, and switched off the moment an artefact takes
 * focus — a visitor reading a case study is exactly who this must not happen
 * to. The cold project route never renders it at all.
 *
 * It draws nothing itself. Everything it does happens in `lib/tidal`, on the
 * elements marked `data-tidal`.
 */
export function TidalText() {
  const pathname = usePathname();

  useEffect(() => {
    startTidal();
    return stopTidal;
  }, []);

  useEffect(() => {
    setTidalEnabled(pathname === "/");
  }, [pathname]);

  return null;
}
