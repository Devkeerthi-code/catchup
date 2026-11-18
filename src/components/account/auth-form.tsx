"use client";

import { useId, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/client/api";

type Mode = "signup" | "login";

interface AuthFormProps {
  onAuthed: (email: string) => void;
  initialMode?: Mode;
  submitLabel?: { signup: string; login: string };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(mode: Mode, email: string, password: string): { email?: string; password?: string } {
  const errors: { email?: string; password?: string } = {};
  if (!EMAIL.test(email.trim())) errors.email = "Enter an email like name@example.com.";
  if (mode === "signup" && password.length < 8) errors.password = "Use at least 8 characters.";
  if (mode === "signup" && new TextEncoder().encode(password).length > 72) errors.password = "Use at most 72 characters.";
  if (mode === "login" && !password) errors.password = "Enter your password.";
  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p className="field-error" id={id}>
      <Icon id="u-alert" />
      {message}
    </p>
  );
}

/** Sign up / log in in one form. Validates on the device first; the server validates again. */
export function AuthForm({ onAuthed, initialMode = "signup", submitLabel }: AuthFormProps) {
  const uid = useId();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const found = validate(mode, email, password);
    setErrors(found);
    setFormError(null);
    if (found.email || found.password) {
      document.getElementById(found.email ? `${uid}-email` : `${uid}-pass`)?.focus();
      return;
    }
    setPending(true);
    try {
      const { user } = await apiFetch<{ user: { email: string } }>(`/api/auth/${mode}`, {
        method: "POST",
        json: { email: email.trim(), password },
      });
      toast(mode === "signup" ? "Account created. You're logged in." : "Logged in.");
      onAuthed(user.email);
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "That didn't work. Try again.";
      setFormError(message);
    } finally {
      setPending(false);
    }
  };

  const labels = submitLabel ?? { signup: "Create account", login: "Log in" };
  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <div className="auth-form__modes" role="group" aria-label="Account">
        <button type="button" className="auth-form__mode" aria-pressed={mode === "signup"} onClick={() => setMode("signup")}>
          New here
        </button>
        <button type="button" className="auth-form__mode" aria-pressed={mode === "login"} onClick={() => setMode("login")}>
          I have an account
        </button>
      </div>
      <div className="field">
        <label htmlFor={`${uid}-email`}>Email</label>
        <input
          className="input"
          id={`${uid}-email`}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${uid}-email-err` : undefined}
          disabled={pending}
        />
        <FieldError id={`${uid}-email-err`} message={errors.email} />
      </div>
      <div className="field">
        <label htmlFor={`${uid}-pass`}>Password</label>
        <div className="password">
          <input
            className="input"
            id={`${uid}-pass`}
            type={show ? "text" : "password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={`${uid}-pass-hint${errors.password ? ` ${uid}-pass-err` : ""}`}
            disabled={pending}
          />
          <button
            type="button"
            className="btn btn--ghost btn--sm password__toggle"
            aria-pressed={show}
            aria-controls={`${uid}-pass`}
            onClick={() => setShow((v) => !v)}
          >
            <Icon id="u-eye" />
            {show ? "Hide" : "Show"}
            <span className="visually-hidden"> password</span>
          </button>
        </div>
        <span className="hint" id={`${uid}-pass-hint`}>
          {mode === "signup" ? "At least 8 characters." : "The password you signed up with."}
        </span>
        <FieldError id={`${uid}-pass-err`} message={errors.password} />
      </div>
      {formError ? (
        <p className="field-error" role="alert">
          <Icon id="u-alert" />
          {formError}
        </p>
      ) : null}
      <button className="btn btn--primary" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? <span className="spinner" aria-hidden="true" /> : <span className="btn__dot" aria-hidden="true" />}
        {pending ? (mode === "signup" ? "Creating account…" : "Logging in…") : labels[mode]}
      </button>
    </form>
  );
}
