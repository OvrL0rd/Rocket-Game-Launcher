import { get, post } from "./client";

export interface PlaySession {
  game_id: string;
  platform: string;
  game_name: string;
  started_at: number;
  duration: number; // seconds
}

/** Record a completed play session. */
export const recordSession = (session: PlaySession) =>
  post<{ status: string }>("/playtime/session", session);

/** Returns total seconds played, keyed by "platform:game_id". */
export const getPlaytime = () =>
  get<Record<string, number>>("/playtime");
