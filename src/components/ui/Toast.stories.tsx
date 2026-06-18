import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Toast from "./Toast";
import { withStore } from "../../../.storybook/fixtures";

/**
 * Transient feedback banner. It reads the `toast` message from the global store
 * (set via the `flash` action) and renders nothing when empty.
 */
const meta = {
  title: "UI/Toast",
  component: Toast,
  tags: ["autodocs"],
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {
  decorators: [withStore({ toast: "AI draft έτοιμο" })],
};
