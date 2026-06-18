import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Tree-shake large barrel-export libraries so only the icons/utilities
  // actually used end up in each route's bundle. Cuts first-load JS and
  // speeds up dev/prod compiles.
  experimental: {
    optimizePackageImports: [
      "react-icons",
      "lucide-react",
      "date-fns",
      "framer-motion",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-dialog",
    ],
  },
};

export default nextConfig;
