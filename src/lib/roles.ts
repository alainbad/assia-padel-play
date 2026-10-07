export type SiteRole = "user" | "supervisor" | "admin";
export function resolveRole(isAdmin: boolean, appMetadata: Record<string, unknown> = {}): SiteRole {
  return isAdmin ? "admin" : appMetadata["court_role"] === "supervisor" ? "supervisor" : "user";
}
export function canManageAccount(
  actor: SiteRole,
  target: SiteRole,
  action: "create" | "role" | "password" | "delete",
  self = false,
): boolean {
  if (actor === "user") return false;
  if (action === "create" || action === "role") return actor === "admin" && target !== "admin";
  if (action === "delete" && self) return false;
  if (target === "admin") return action === "password" && actor === "admin" && self;
  return actor === "admin" || target === "user";
}
