import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Select from "./Select";

/**
 * A native <select> styled like the topbar dropdown. Reports the chosen value as
 * a string. Used for role pickers and the dev identity switcher.
 */
const meta = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
  args: {
    value: "Editor",
    options: [
      { value: "Admin", label: "Διαχειριστής" },
      { value: "Editor", label: "Επιμελητής" },
      { value: "Journalist", label: "Δημοσιογράφος" },
      { value: "Analyst", label: "Αναλυτής" },
      { value: "Viewer", label: "Θεατής" },
    ],
  },
  argTypes: { onChange: { action: "changed" } },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithLabel: Story = { args: { label: "Ρόλος" } };
export const Disabled: Story = { args: { label: "Ρόλος", disabled: true } };
