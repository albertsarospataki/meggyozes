import type { NextConfig } from "next";

const config: NextConfig = {
  // A Playwright és a node:sqlite futásidejű, natív függőségek — a köteg-építőnek
  // nem szabad hozzájuk nyúlnia, különben a böngésző-bináris útvonala és a beépített
  // SQLite-modul is elveszik a bundle-ben.
  serverExternalPackages: ["playwright"],
  typedRoutes: false,
};

export default config;
