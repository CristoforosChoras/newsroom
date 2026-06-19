import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Tooltip from "./Tooltip";

/**
 * A CSS-driven tooltip primitive. Wrap any trigger; the `content` bubble appears
 * on hover and on keyboard focus (`role="tooltip"` + `aria-describedby`). Four
 * `placement`s, wraps long text, no JS positioning. Used for the KPI
 * Preliminary/Final badges and the "approximate users" caveat.
 */
const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  args: {
    content: "Σύντομη επεξήγηση για το στοιχείο.",
    children: (
      <span style={{ borderBottom: "1px dashed var(--dim)", fontSize: 13 }}>
        πέρασε τον δείκτη
      </span>
    ),
  },
  argTypes: {
    placement: { control: "inline-radio", options: ["top", "bottom", "left", "right"] },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 80, display: "flex", justifyContent: "center" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Top: Story = { args: { placement: "top" } };
export const Bottom: Story = { args: { placement: "bottom" } };
export const Left: Story = { args: { placement: "left" } };
export const Right: Story = { args: { placement: "right" } };

/** A real example: the KPI "Preliminary" badge with its full explanation. */
export const OnBadge: Story = {
  args: {
    placement: "bottom",
    content:
      "Προσωρινά στοιχεία: το GA4 επεξεργάζεται δεδομένα για ~24–72 ώρες, οπότε αριθμοί που περιλαμβάνουν σήμερα/χθες μπορεί να αλλάξουν. Ανανεώνονται αυτόματα κάθε ώρα μέχρι να οριστικοποιηθούν.",
    children: (
      <span
        style={{
          color: "var(--amber)",
          border: "1px solid color-mix(in srgb, var(--amber) 40%, transparent)",
          borderRadius: 5,
          padding: "2px 7px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
        }}
      >
        Προσωρινά
      </span>
    ),
  },
};
