"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        marginLeft: "6px",
        background: "transparent",
        border: "none",
        color: "var(--text-dim)",
        fontSize: "11px",
        cursor: "pointer",
        padding: "2px 6px",
        borderRadius: "4px",
      }}
    >
      ×
    </button>
  );
}
