import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ConfirmDialog from "./ConfirmDialog";

/**
 * A styled confirmation modal — the app's replacement for `window.confirm`.
 * Driven in the app via the store (`askConfirm` / `closeConfirm`), but the
 * primitive itself is pure props. Use `danger` for destructive actions.
 */
const meta = {
  title: "UI/ConfirmDialog",
  component: ConfirmDialog,
  tags: ["autodocs"],
  args: {
    open: true,
    title: "Διαγραφή κάρτας",
    message: "Διαγραφή αυτής της κάρτας; Η ενέργεια δεν αναιρείται.",
    confirmLabel: "Διαγραφή",
    cancelLabel: "Άκυρο",
    danger: true,
  },
  argTypes: {
    onConfirm: { action: "confirmed" },
    onCancel: { action: "cancelled" },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Danger: Story = {};
export const Neutral: Story = {
  args: {
    title: "Επιβεβαίωση",
    message: "Θέλεις να συνεχίσεις με αυτή την ενέργεια;",
    confirmLabel: "Συνέχεια",
    danger: false,
  },
};
