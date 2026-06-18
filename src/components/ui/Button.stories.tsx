import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Plus } from "lucide-react";
import Button from "./Button";

/**
 * The primary action button. Three visual `variant`s, an optional leading
 * `icon`, a `loading` spinner state, and a `small` size.
 */
const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Run now" },
  argTypes: {
    variant: { control: "inline-radio", options: ["solid", "ghost", "soft"] },
    onClick: { action: "clicked" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Solid: Story = { args: { variant: "solid" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Soft: Story = { args: { variant: "soft" } };
export const WithIcon: Story = { args: { variant: "soft", icon: Plus, children: "Create cell" } };
export const Loading: Story = { args: { loading: true, children: "Working…" } };
export const Small: Story = { args: { small: true, variant: "soft", children: "Save" } };
export const Disabled: Story = { args: { disabled: true, children: "Unavailable" } };
