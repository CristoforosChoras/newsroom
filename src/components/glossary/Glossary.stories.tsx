import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Glossary from "./Glossary";

/** Searchable, accent-insensitive glossary of newsroom terms (static config). */
const meta = {
  title: "Views/Glossary",
  component: Glossary,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Glossary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
