import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixe explicitement la racine du projet : il existe un package-lock.json
  // résiduel dans le dossier utilisateur qui faussait l'inférence de Turbopack.
  turbopack: {
    root: path.join(__dirname),
  },
  // Les photos sont déjà compressées (WebP via sharp). On sert les fichiers tels
  // quels : l'optimizer de Next 16 rejette les chemins locaux de /uploads
  // (« url parameter is invalid »), ce qui empêchait l'affichage des images.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
