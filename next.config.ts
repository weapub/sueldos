import type { NextConfig } from "next";

// Orígenes autorizados a embeber sueldos en un <iframe> (integración como módulo
// dentro de systeg). Se configuran por env en el VPS, separados por espacios, p. ej.:
//   SUELDOS_FRAME_ANCESTORS="https://app.systeg.com https://*.systeg.com"
// Sin la env, solo el propio origen puede embeber (comportamiento seguro por defecto).
const frameAncestors = ["'self'", process.env.SUELDOS_FRAME_ANCESTORS]
  .filter(Boolean)
  .join(" ");

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // El import de altas de ARCA sube una foto/PDF a un Server Action.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${frameAncestors};`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
