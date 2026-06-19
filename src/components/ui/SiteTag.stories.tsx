import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SiteTag from "./SiteTag";

/**
 * A portal chip coloured by the site's brand. `id` is a site id from the network
 * config; an unknown/null id renders the "no site" placeholder.
 */
const meta = {
  title: "UI/SiteTag",
  component: SiteTag,
  tags: ["autodocs"],
} satisfies Meta<typeof SiteTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sportal: Story = { args: { id: "sportal" } };
export const Popaganda: Story = { args: { id: "popaganda" } };
export const Muse: Story = { args: { id: "muse" } };
export const Unrouted: Story = { args: { id: null } };
export const Small: Story = { args: { id: "sportal", small: true } };
