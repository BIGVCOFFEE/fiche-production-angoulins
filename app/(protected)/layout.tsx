import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";
import NavLinks from "./NavLinks";
import { getUserRole } from "@/lib/auth/role";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr", height: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elev)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 600 }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            />
            <span>Production</span>
          </div>

          <NavLinks isAdmin={isAdmin} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px 10px 4px 4px",
            background: "var(--bg-elev-2)",
            borderRadius: "16px",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #ec4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 600,
              color: "white",
            }}
          >
            {user.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <span style={{ fontSize: "13px" }}>{user.email}</span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <main style={{ overflow: "auto" }}>{children}</main>
    </div>
  );
}
