// Draws the tier coins `format` leaves in text: <Num n={x} /> for a number, <Coins text={s} /> for a line.
import { coinParts, format } from "@clickers/sim";

export function Coins({ text }: { text: string }) {
  return (
    <>
      {coinParts(text).map((p, i) =>
        typeof p === "number" ? (
          <span key={i} className="coin" title={`× 1000^${p}`}>
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function Num({ n }: { n: number }) {
  return <Coins text={format(n)} />;
}
