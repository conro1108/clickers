/**
 * Which database this talks to, and which game is doing the talking.
 *
 * One schema serves both clickers. The tables hold nothing but an append-only
 * log of commands, and the engine that folds that log is now literally the same
 * code in both games — so a potato match and a puppy match are the same rows
 * with different words drawn over them. What `GAME` is for is keeping the two
 * lobbies apart: you should find your friend's puppy mill in the puppy game,
 * not halfway down a list of potato farms.
 */

export const SCHEMA = "clickers";

export type GameId = "potatoes" | "puppies";

/** Set per app in its .env — see apps/potatoes/.env and apps/puppies/.env. */
export const GAME = import.meta.env.VITE_GAME as GameId;

if (GAME !== "potatoes" && GAME !== "puppies") {
  throw new Error(`VITE_GAME must be "potatoes" or "puppies", got ${JSON.stringify(GAME)}`);
}

/** Realtime channel names have to be unique per game as well as per row. */
export const channelName = (kind: string, id: string): string => `${SCHEMA}:${GAME}:${kind}:${id}`;
