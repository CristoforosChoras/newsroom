import type { StorybookConfig } from "@storybook/nextjs-vite";
import { fileURLToPath } from "node:url";

// Storybook 10 + @storybook/nextjs-vite (Next 16 / React 19 / Turbopack-friendly).
// Docs/autodocs and MDX support are built into the framework.
const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-themes", "@storybook/addon-docs"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  // Resolve the project's "@/* -> src/*" path alias for stories.
  async viteFinal(cfg) {
    cfg.resolve = cfg.resolve ?? {};
    cfg.resolve.alias = {
      ...(cfg.resolve.alias ?? {}),
      "@": fileURLToPath(new URL("../src", import.meta.url)),
    };
    return cfg;
  },
};

export default config;
