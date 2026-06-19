import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Trends from "./Trends";
import { withStore } from "../../../.storybook/fixtures";

/** Trend Radar: ranked rising topics with lifecycle, platforms, coverage, a sparkline and a Greek angle. */
const meta = {
  title: "Views/Trends",
  component: Trends,
  parameters: { layout: "fullscreen" },
  decorators: [withStore()],
} satisfies Meta<typeof Trends>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
