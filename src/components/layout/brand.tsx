import Link from "next/link";

export function BrandMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 22 22" aria-hidden="true">
      <rect className="n" x="1" y="2" width="13" height="3" rx="1.5" />
      <rect className="n" x="1" y="7" width="19" height="3" rx="1.5" />
      <rect className="s" x="1" y="12" width="20" height="4" rx="2" />
      <rect className="n" x="1" y="18" width="9" height="3" rx="1.5" />
    </svg>
  );
}

export function Brand({ label }: { label?: string }) {
  return (
    <Link className="brand" href="/" aria-label={label}>
      <BrandMark />
      CatchUp
    </Link>
  );
}
