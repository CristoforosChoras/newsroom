import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CellDrawer from "./CellDrawer";
import { withStore } from "../../../.storybook/fixtures";

/**
 * The side drawer for a single cell: source/original block, role-aware stage
 * actions (assign / generate draft / submit / send back / approve & publish) and
 * the publish-gate blockers. Open state comes from the store (`open` = cell id).
 */
const meta = {
  title: "Views/CellDrawer",
  component: CellDrawer,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CellDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InReview: Story = { decorators: [withStore({ open: "c_review" })] };
export const BreakingInbox: Story = { decorators: [withStore({ open: "c_inbox" })] };
export const ReturnedWithNotes: Story = { decorators: [withStore({ open: "c_returned" })] };
