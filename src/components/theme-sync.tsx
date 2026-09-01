"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";

/**
 * Sincroniza el tema cuando sueldos corre embebido dentro de systeg:
 *  - al cargar, respeta `?theme=dark|light` de la URL de entrada;
 *  - después escucha `postMessage({ type: "systeg:theme", theme })` para
 *    seguir los cambios de tema del contenedor en vivo.
 * Fuera del embed no hace nada (no hay param ni mensajes).
 */
export function ThemeSync() {
  const params = useSearchParams();
  const { setTheme } = useTheme();

  useEffect(() => {
    const fromUrl = params.get("theme");
    if (fromUrl === "dark" || fromUrl === "light") {
      setTheme(fromUrl);
    }
  }, [params, setTheme]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as { type?: string; theme?: string } | null;
      if (data?.type !== "systeg:theme") return;
      if (data.theme === "dark" || data.theme === "light" || data.theme === "system") {
        setTheme(data.theme);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setTheme]);

  return null;
}
