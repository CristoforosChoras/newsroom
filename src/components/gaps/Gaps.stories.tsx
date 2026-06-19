import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Gaps from "./Gaps";
import { withStore } from "../../../.storybook/fixtures";

/** Competition Analysis: paste competitor URLs → async scout → ranked Missed/Behind findings + suggested angle. */
const meta = {
  title: "Views/Competition",
  component: Gaps,
  parameters: { layout: "fullscreen" },
  decorators: [withStore()],
} satisfies Meta<typeof Gaps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
