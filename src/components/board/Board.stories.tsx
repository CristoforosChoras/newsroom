import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Board from "./Board";
import { withStore } from "../../../.storybook/fixtures";

/** The 5-stage kanban board (inbox → assigned → ai_draft → review → published), seeded with sample cells. */
const meta = {
  title: "Views/Board",
  component: Board,
  parameters: { layout: "fullscreen" },
  decorators: [withStore()],
} satisfies Meta<typeof Board>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
