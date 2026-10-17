import axios from "axios";
import { AppError } from "../lib/errors.js";
let cached;
let pending;
export async function getIceServers() {
  if (cached?.expires > Date.now()) return cached.servers;
  if (
    !process.env.METERED_API_KEY ||
    !/^[a-zA-Z0-9-]+$/.test(process.env.METERED_APP_NAME || "")
  )
    throw new AppError(
      503,
      "Voice relay is temporarily unavailable. You can still use lobby chat.",
      "VOICE_UNAVAILABLE",
    );
  if (!pending)
    pending = (async () => {
      try {
        const { data } = await axios.get(
          `https://${process.env.METERED_APP_NAME}.metered.live/api/v1/turn/credentials`,
          { params: { apiKey: process.env.METERED_API_KEY }, timeout: 10000 },
        );
        if (
          !Array.isArray(data) ||
          !data.some((item) =>
            [item.urls].flat().some((url) => /^turns?:/.test(url)),
          )
        )
          throw new Error("Missing relay");
        const servers = data.map(({ urls, username, credential }) => ({
          urls,
          username,
          credential,
        }));
        cached = { servers, expires: Date.now() + 60_000 };
        return servers;
      } catch {
        throw new AppError(
          503,
          "Voice relay is temporarily unavailable. You can still use lobby chat.",
          "VOICE_UNAVAILABLE",
        );
      }
    })().finally(() => {
      pending = null;
    });
  return pending;
}
