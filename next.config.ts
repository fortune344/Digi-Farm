import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixe explicitement la racine du projet : il existe un package-lock.json
  // résiduel dans le dossier utilisateur qui faussait l'inférence de Turbopack.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
