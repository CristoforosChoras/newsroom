import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SlaClock from "./SlaClock";

/**
 * A live SLA countdown (2-minute window) shown on breaking cells. It ticks every
 * 500ms and turns amber, then red, as the deadline approaches/passes.
 */
const meta = {
  title: "UI/SlaClock",
  component: SlaClock,
  tags: ["autodocs"],
} satisfies Meta<typeof SlaClock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Healthy: Story = { args: { deadline: Date.now() + 110_000 } };
export const Warning: Story = { args: { deadline: Date.now() + 30_000 } };
export const Overdue: Story = { args: { deadline: Date.now() - 5_000 } };
