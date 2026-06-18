import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Radar } from "lucide-react";
import Eyebrow from "./Eyebrow";

/** A small uppercase section label, optionally with a leading accent icon. */
const meta = {
  title: "UI/Eyebrow",
  component: Eyebrow,
  tags: ["autodocs"],
  args: { children: "TREND RADAR" },
} satisfies Meta<typeof Eyebrow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithIcon: Story = { args: { icon: Radar } };
