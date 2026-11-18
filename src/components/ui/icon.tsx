import type { IconId } from "@/lib/ui/items";

interface IconProps {
  id: IconId;
  className?: string;
}

/** One sprite (public/icons.svg), one stroke style. Always decorative: pair it with text. */
export function Icon({ id, className = "icon" }: IconProps) {
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <use href={`/icons.svg#${id}`} />
    </svg>
  );
}
