import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CellCard from "./CellCard";
import { sampleCells } from "../../../.storybook/fixtures";

const byId = (id: string) => sampleCells.find((c) => c.id === id)!;

/**
 * A single story cell on the board. Shows site tag, urgency, assignee/reviewer
 * avatars, version badge, the publish-gate SEO dot, and an SLA clock for breaking
 * cells. Pure — pass a `Cell`; `onClick`/`onDragStart` are wired by the board.
 */
const meta = {
  title: "Board/CellCard",
  component: CellCard,
  tags: ["autodocs"],
  args: { onClick: () => {}, onDragStart: () => {} },
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CellCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Breaking: Story = { args: { cell: byId("c_inbox") } };
export const InReview: Story = { args: { cell: byId("c_review") } };
export const Published: Story = { args: { cell: byId("c_published") } };
export const ReturnedWithNotes: Story = { args: { cell: byId("c_returned") } };
