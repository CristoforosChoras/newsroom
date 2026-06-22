"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Lock, Radio } from "lucide-react";
import { DEMO_USERS } from "@/lib/auth";
import { useAuth, useAuthHydrated } from "@/lib/store/useAuth";
import { roleLabelAuth } from "@/lib/config/permissions";
import { T } from "@/lib/config/strings";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import styles from "./Login.module.css";

export default function Login() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const hydrated = useAuthHydrated();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  // Already signed in (e.g. landed on /login with a live session) → go home.
  useEffect(() => {
    if (hydrated && isAuthenticated) router.replace("/");
  }, [hydrated, isAuthenticated, router]);

  const submit = async () => {
    setError(false);
    setBusy(true);
    const ok = await login(email, password);
    setBusy(false);
    if (ok) router.replace("/");
    else setError(true);
  };

  return (
    <Panel className={styles.card} pad={28}>
      <div className={styles.brand}>
        <span className={styles.logo}>
          <Radio size={18} color="#0a0a0b" />
        </span>
        <div>
          <div className={styles.brandName}>{T.auth.brand}</div>
          <div className={styles.brandSub}>{T.auth.brandSub}</div>
        </div>
      </div>

      <h1 className={styles.title}>{T.auth.loginTitle}</h1>
      <p className={styles.subtitle}>{T.auth.loginSubtitle}</p>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          label={T.auth.emailLabel}
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={setEmail}
          placeholder={T.auth.emailPlaceholder}
        />
        <Input
          label={T.auth.passwordLabel}
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          placeholder={T.auth.passwordPlaceholder}
        />
        {error && <div className={styles.error}>{T.auth.signInFailed}</div>}
        <Button type="submit" icon={LogIn} loading={busy} className={styles.submit}>
          {T.auth.signIn}
        </Button>
      </form>

      <div className={styles.demo}>
        <div className={styles.demoTitle}>{T.auth.demoUsersTitle}</div>
        <div className={styles.demoHint}>{T.auth.demoHint}</div>
        <ul className={styles.demoList}>
          {DEMO_USERS.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                className={styles.demoUser}
                onClick={() => {
                  setEmail(u.email);
                  setError(false);
                }}
              >
                <span className={styles.demoName}>{u.name}</span>
                <span className={styles.demoEmail}>{u.email}</span>
                <span className={styles.demoRole}>{roleLabelAuth[u.role]}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.caveat}>
        <Lock size={13} />
        <span>{T.auth.mockCaveat}</span>
      </div>
    </Panel>
  );
}
