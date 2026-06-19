import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Agents from "./Agents";
import { withStore } from "../../../.storybook/fixtures";

/**
 * The agents control panel: each AI agent card with an on/off toggle, schedule,
 * "Run now", and (for AMNA ingestion) the cadence-minutes input.
 */
const meta = {
  title: "Views/Agents",
  component: Agents,
  parameters: { layout: "fullscreen" },
  decorators: [withStore()],
} satisfies Meta<typeof Agents>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
