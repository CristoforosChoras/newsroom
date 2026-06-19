import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Panel from "./Panel";

/** The base card/surface container. Everything sits on a `Panel`; `pad` controls inner padding. */
const meta = {
  title: "UI/Panel",
  component: Panel,
  tags: ["autodocs"],
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: <div style={{ color: "var(--text)" }}>Panel content</div> },
};

export const TightPadding: Story = {
  args: { pad: 8, children: <div style={{ color: "var(--text)" }}>pad = 8</div> },
};
