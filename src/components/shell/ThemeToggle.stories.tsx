import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ThemeToggle from "./ThemeToggle";

/**
 * Dark/light switch. It reads & writes `data-theme` on `<html>` plus localStorage
 * via `useSyncExternalStore` (hydration-safe). Use the toolbar theme switch to see
 * the rest of the UI follow.
 */
const meta = {
  title: "Shell/ThemeToggle",
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
