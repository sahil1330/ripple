// Minimal 24px stroke icons for the app shell (phone tab bar / tablet rail).
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function IconChat() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" {...P}>
      <path d="M4 5h16v11H9l-5 4z" />
    </svg>
  );
}
export function IconInbox() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" {...P}>
      <path d="M4 13l2.5-8h11L20 13v6H4z" />
      <path d="M4 13h4.5l1.5 2.5h4l1.5-2.5H20" />
    </svg>
  );
}
export function IconTeams() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" {...P}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M16 14.2c2.3.2 3.9 2 4.5 4.8" />
    </svg>
  );
}
export function IconGraph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" {...P}>
      <circle cx="6" cy="7" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="12" cy="17" r="2.6" />
      <path d="M8 8.2l2.8 6.6M16.6 7.8l-3.4 7M8.2 6.8l7.6-.6" />
    </svg>
  );
}
export function IconMore() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" {...P}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </svg>
  );
}
