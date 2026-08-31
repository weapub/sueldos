import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // El import de altas de ARCA sube una foto/PDF a un Server Action.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
