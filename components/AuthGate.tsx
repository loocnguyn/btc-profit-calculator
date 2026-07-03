"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSession, supabase, supabaseEnabled } from "@/lib/supabase";
import Calculator from "./Calculator";
import AuthForm from "./AuthForm";

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getSession().then((s) => {
      if (!cancelled) {
        setSession(s);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!supabaseEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <p className="text-loss font-mono text-sm max-w-md">
          Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY to use this app.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500 font-mono text-sm">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthForm />;
  }

  return <Calculator session={session} />;
}
