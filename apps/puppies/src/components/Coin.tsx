// Draws the tier coins `format` leaves in text: <Num n={x} /> for a number, <Coins text={s} /> for a line.
import { coinParts, format } from "@clickers/sim";

import { coinArt } from "../render/coin.js";
import { artUrl } from "../render/pixel.js";

export function Coins({ text }: { text: string }) {
  // A word with a coin in it ("+3.40①/s") stays one piece, or the line breaks either side of the coin.
  return (
    <>
      {text.split(/(\s+)/).map((word, w) => {
        const parts = coinParts(word);
        if (parts.length === 1 && typeof parts[0] === "string") return word;
        return (
          <span key={w} className="coin-word">
            {parts.map((p, i) =>
              typeof p === "number" ? (
                <img key={i} className="coin" src={artUrl(coinArt(p))} alt={`(${p})`} title={`× 1000^${p}`} />
              ) : (
                p
              ),
            )}
          </span>
        );
      })}
    </>
  );
}

export function Num({ n }: { n: number }) {
  return <Coins text={format(n)} />;
}
