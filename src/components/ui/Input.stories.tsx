import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Input from "./Input";

/**
 * A labelled text input. Reports its value as a string via `onChange`. Used by
 * the login form and user-management screen.
 */
const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  args: { value: "", placeholder: "name@matrix.gr" },
  argTypes: { onChange: { action: "changed" } },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithLabel: Story = { args: { label: "Email", type: "email" } };
export const Password: Story = { args: { label: "Κωδικός", type: "password", value: "secret" } };
export const Disabled: Story = { args: { label: "Email", disabled: true, value: "admin@matrix.gr" } };
