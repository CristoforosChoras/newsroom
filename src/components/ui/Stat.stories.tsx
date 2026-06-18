import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Stat from "./Stat";

/** A labeled metric tile (used across the dashboard). `sub` is an optional delta/footnote. */
const meta = {
  title: "UI/Stat",
  component: Stat,
  tags: ["autodocs"],
  args: { label: "Προβολές σήμερα", value: "48.210" },
} satisfies Meta<typeof Stat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const PositiveDelta: Story = {
  args: { sub: "▲ 6.4% vs χθες", subColor: "var(--green)" },
};
export const NegativeDelta: Story = {
  args: { value: "12.880", sub: "▼ 2.1% vs χθες", subColor: "var(--red)" },
};
