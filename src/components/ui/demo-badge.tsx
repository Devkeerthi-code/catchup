export function DemoBadge({ children = "Demo" }: { children?: string }) {
  return <span className="demo-badge">{children}</span>;
}
