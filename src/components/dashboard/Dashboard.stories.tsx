import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Dashboard from "./Dashboard";
import { withStore } from "../../../.storybook/fixtures";

/** Network overview: per-portal KPI tiles, a 7-day pageviews chart, top articles and traffic sources. */
const meta = {
  title: "Views/Dashboard",
  component: Dashboard,
  parameters: { layout: "fullscreen" },
  decorators: [withStore()],
} satisfies Meta<typeof Dashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
