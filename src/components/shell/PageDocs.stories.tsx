import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PageDocs from "./PageDocs";

/**
 * The collapsible "how it works & why" panel shown on every page. It reads the
 * current route via `usePathname()` and renders the matching doc entry.
 */
const meta = {
  title: "Shell/PageDocs",
  component: PageDocs,
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true, navigation: { pathname: "/newsroom" } },
  },
} satisfies Meta<typeof PageDocs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Newsroom: Story = {};
