import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Users from "./Users";

/**
 * Admin User Management: the demo users list with role assignment, plus the
 * editable role→permission matrix (the single source of truth that nav + guards
 * read). Edit controls are gated behind `users.manage`; without a signed-in
 * Admin session the screen renders read-only.
 */
const meta = {
  title: "Screens/Users",
  component: Users,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Users>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
