"use client";

import { useState, type FormEvent } from "react";
import {
  isValidUsername,
  signInWithGoogle,
  signInWithUsername,
  signUpWithUsername,
} from "@/lib/supabase";

export default function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleClick() {
    setError(null);
    setGoogleLoading(true);
    const { error: oauthError } = await signInWithGoogle();
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
    // On success the browser redirects to Google, so no further state change here.
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = username.trim().toLowerCase();
    if (!isValidUsername(trimmed)) {
      setError(
        "Username must be 3-20 characters: lowercase letters, numbers, underscore only."
      );
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "register") {
        const { data, error: signUpError } = await signUpWithUsername(trimmed, password);
        if (signUpError) throw signUpError;
        if (!data.session) {
          setError(
            'Account created, but sign-in did not start automatically. Ask the site owner to disable "Confirm email" in Supabase Auth settings, then log in.'
          );
        }
      } else {
        const { error: signInError } = await signInWithUsername(trimmed, password);
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #f7931a, transparent 70%)" }}
      />

      <div className="relative w-full max-w-sm bg-panel border border-border rounded-2xl p-6 sm:p-8 flex flex-col gap-5 shadow-2xl">
        <div className="text-center flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-btc">₿</span> BTC Profit Calculator
          </h1>
          <p className="text-xs text-neutral-500 font-mono">
            Track trades, targets, and profit in real time.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={googleLoading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-bg text-sm font-medium text-neutral-200 hover:border-btc transition-colors disabled:opacity-50"
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3 text-neutral-600 text-xs font-mono">
          <div className="flex-1 h-px bg-border" />
          or
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden font-mono text-sm">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 py-2 transition-colors ${
              mode === "login" ? "bg-btc text-black font-semibold" : "text-neutral-400"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 py-2 transition-colors ${
              mode === "register" ? "bg-btc text-black font-semibold" : "text-neutral-400"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            className="bg-bg border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-btc transition-colors"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className="bg-bg border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-btc transition-colors"
          />
          {error && <p className="text-loss text-xs font-mono">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 rounded-lg bg-btc text-black font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.9 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.7 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5C40.5 36.3 44 30.7 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
