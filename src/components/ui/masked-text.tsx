import { revealNames, splitMasked, type NameMap } from "@/lib/ui/names";

interface MaskedTextProps {
  text: string;
  names?: NameMap | null;
}

/** Sanitised text with "[phone]"-style tokens shown as small labelled chips. */
export function MaskedText({ text, names = null }: MaskedTextProps) {
  return (
    <>
      {splitMasked(revealNames(text, names)).map((piece, i) =>
        piece.kind === "text" ? (
          <span key={i}>{piece.text}</span>
        ) : (
          <span key={i} className="masked">
            {piece.label}
          </span>
        ),
      )}
    </>
  );
}
