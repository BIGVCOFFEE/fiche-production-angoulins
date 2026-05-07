"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    } else {
      router.push("/aujourdhui");
      router.refresh();
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "32px",
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "3px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            />
            <span style={{ fontWeight: 600, fontSize: "16px", color: "var(--text)" }}>
              Production
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-dim)" }}>
            Connectez-vous pour accéder à la fiche de production.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-dim)",
                marginBottom: "6px",
              }}
            >
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                background: "var(--bg-elev-2)",
                border: "1px solid var(--border)",
                borderRadius: "7px",
                color: "var(--text)",
                fontSize: "14px",
                fontFamily: "inherit",
                outline: "none",
                transition: "border-color 0.1s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-dim)",
                marginBottom: "6px",
              }}
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                background: "var(--bg-elev-2)",
                border: "1px solid var(--border)",
                borderRadius: "7px",
                color: "var(--text)",
                fontSize: "14px",
                fontFamily: "inherit",
                outline: "none",
                transition: "border-color 0.1s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {error && (
            <p
              style={{
                fontSize: "13px",
                color: "var(--red)",
                marginBottom: "16px",
                padding: "8px 12px",
                background: "var(--red-soft)",
                borderRadius: "6px",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: loading ? "var(--bg-elev-2)" : "var(--accent)",
              border: "none",
              borderRadius: "7px",
              color: "white",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.1s",
            }}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
