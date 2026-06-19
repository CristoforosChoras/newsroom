import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Reports from "./Reports";
import { withStore } from "../../../.storybook/fixtures";

/** Reports view: SEO retrospective (issues/offenders/lessons) and KPI snapshots, seeded with samples. */
const meta = {
  title: "Views/Reports",
  component: Reports,
  parameters: { layout: "fullscreen" },
  decorators: [withStore()],
} satisfies Meta<typeof Reports>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
