export const lighthouseRouteMatrix = [
  {
    id: "home",
    path: "/",
    label: "Home",
    workflow: "public landing and guild identity",
    profiles: ["mobile", "desktop"],
  },
  {
    id: "join",
    path: "/join",
    label: "Join",
    workflow: "website to Discord funnel",
    profiles: ["mobile"],
  },
  {
    id: "events",
    path: "/events",
    label: "Events",
    workflow: "community heartbeat",
    profiles: ["mobile"],
  },
  {
    id: "gallery",
    path: "/gallery",
    label: "Gallery",
    workflow: "public gallery discovery",
    profiles: ["mobile", "desktop"],
  },
  {
    id: "recruitment",
    path: "/recruitment",
    label: "Recruitment",
    workflow: "public recruiting context",
    profiles: ["mobile"],
  },
  {
    id: "auth",
    path: "/auth",
    label: "Auth",
    workflow: "Discord login entry",
    profiles: ["mobile"],
  },
  {
    id: "account",
    path: "/account",
    label: "Account",
    workflow: "signed-out and member account boundary",
    profiles: ["mobile"],
  },
  {
    id: "members",
    path: "/members",
    label: "Members",
    workflow: "members-only directory boundary",
    profiles: ["mobile"],
  },
  {
    id: "gallery-submit",
    path: "/gallery-submit",
    label: "Gallery Submit",
    workflow: "member upload gate",
    profiles: ["mobile"],
  },
  {
    id: "leader-dashboard",
    path: "/leader-dashboard",
    label: "Leader Dashboard",
    workflow: "moderator workflow gate",
    profiles: ["mobile"],
  },
  {
    id: "mochi-social",
    path: "/games/mochi-social",
    label: "Mochi Social",
    workflow: "tester game doorway",
    profiles: ["mobile"],
  },
];

export function lighthouseAuditTargets(baseUrl = "https://mochirii.com") {
  const normalizedBase = String(baseUrl || "https://mochirii.com").replace(/\/+$/, "");
  return lighthouseRouteMatrix.flatMap((route) =>
    route.profiles.map((profile) => ({
      ...route,
      profile,
      outputId: `${route.id}-${profile}`,
      url: `${normalizedBase}${route.path === "/" ? "/" : route.path}`,
    })),
  );
}
