import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Gaps from "./Gaps";
import { withStore } from "../../../.storybook/fixtures";

/** Content Gaps: demand-with-weak-coverage opportunities, each with winnability and a create-cell action. */
const meta = {
  title: "Views/Gaps",
  component: Gaps,
  parameters: { layout: "fullscreen" },
  decorators: [withStore()],
} satisfies Meta<typeof Gaps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
