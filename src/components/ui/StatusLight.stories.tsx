import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import StatusLight from "./StatusLight";

/** A glowing status dot. `s` is a RAG status (green / amber / red). */
const meta = {
  title: "UI/StatusLight",
  component: StatusLight,
  tags: ["autodocs"],
  argTypes: { s: { control: "inline-radio", options: ["green", "amber", "red"] } },
} satisfies Meta<typeof StatusLight>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Green: Story = { args: { s: "green" } };
export const Amber: Story = { args: { s: "amber" } };
export const Red: Story = { args: { s: "red" } };
