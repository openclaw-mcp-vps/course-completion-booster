"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface UnlockState {
  status: "idle" | "loading" | "success" | "error";
  message: string;
}

export function UnlockAccess() {
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState("");
  const [submittedSessionId, setSubmittedSessionId] = useState("");
  const [state, setState] = useState<UnlockState>({ status: "idle", message: "" });

  useEffect(() => {
    const redirectedSessionId = searchParams.get("session_id");
    if (!redirectedSessionId) {
      return;
    }

    setSessionId(redirectedSessionId);
    setSubmittedSessionId(redirectedSessionId);
  }, [searchParams]);

  useEffect(() => {
    if (!submittedSessionId) {
      return;
    }

    const unlock = async () => {
      setState({ status: "loading", message: "Verifying checkout session and unlocking dashboard..." });

      try {
        const response = await fetch("/api/paywall/unlock", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sessionId: submittedSessionId })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error || "Unlock failed");
        }

        setState({
          status: "success",
          message: "Access unlocked. You can now open the retention dashboard."
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not unlock access.";
        setState({ status: "error", message });
      }
    };

    unlock().catch(() => {
      setState({ status: "error", message: "Could not unlock access." });
    });
  }, [submittedSessionId]);

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
      <h3 className="text-2xl font-semibold text-white">Unlock your paid dashboard</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        Configure your Stripe Payment Link to redirect back with <code>?session_id=CHECKOUT_SESSION_ID</code> after payment. Paste the session ID
        below if it was not appended automatically.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={sessionId}
          onChange={(event) => setSessionId(event.target.value)}
          placeholder="cs_test_..."
          className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400"
        />
        <button
          type="button"
          onClick={() => {
            if (!sessionId) {
              setState({ status: "error", message: "Enter a checkout session ID first." });
              return;
            }

            setState({ status: "idle", message: "" });
            setSubmittedSessionId(sessionId.trim());
          }}
          className="rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Verify purchase
        </button>
      </div>

      {searchParams.get("paywall") === "locked" ? (
        <p className="mt-3 text-sm text-amber-300">Dashboard access requires a valid paid session cookie.</p>
      ) : null}

      {state.status !== "idle" ? (
        <p
          className={`mt-3 text-sm ${
            state.status === "success" ? "text-emerald-300" : state.status === "error" ? "text-rose-300" : "text-slate-300"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <Link
        href="/dashboard"
        className="mt-5 inline-flex rounded-md border border-cyan-300/50 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-200"
      >
        Open dashboard
      </Link>
    </section>
  );
}
