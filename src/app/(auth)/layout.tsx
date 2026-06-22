import styles from "./auth.module.css";

// Bare, chrome-free layout for the login route (no sidebar/topbar). Auth state is
// already rehydrated by <AuthHydration/> in the root layout.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.wrap}>{children}</div>;
}
