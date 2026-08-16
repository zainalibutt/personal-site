import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the workspace root. Without this, Turbopack walks up and finds an
  // unrelated package-lock.json in C:\Users\Zain and warns on every build.
  turbopack: { root: path.resolve(import.meta.dirname) },
};

export default nextConfig;
