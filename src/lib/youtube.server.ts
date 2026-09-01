/**
 * Server-only helpers to pull a transcript from a YouTube video.
 * Throws: youtube_invalid_url, youtube_no_captions, openai_quota, openai_invalid_key.
 */

import { parseYoutubeId } from "./youtube-url";

export { parseYoutubeId };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#34;|&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)));
}

type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
  name?: { simpleText?: string };
};

function extractJson<T>(html: string, key: string): T | null {
  const idx = html.indexOf(key);
  if (idx === -1) return null;
  // find the start of the value (array or object) after the key
  let i = html.indexOf(":", idx + key.length);
  if (i === -1) return null;
  i += 1;
  while (i < html.length && /\s/.test(html[i]!)) i++;
  const open = html[i];
  if (open !== "[" && open !== "{") return null;
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = i; j < html.length; j++) {
    const ch = html[j]!;
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(i, j + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function parseCaptionXml(xml: string): string {
  // YouTube serves either srv1 (<text>) or srv3 (<p>/<s>) markup.
  const nodes = [
    ...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g),
    ...xml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g),
  ];
  return nodes
    .map((m) => decodeEntities((m[1] ?? "").replace(/<[^>]+>/g, "")))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTrackText(baseUrl: string): Promise<string> {
  // Strip any existing fmt so our own format request wins.
  const url = baseUrl.replace(/&amp;/g, "&").replace(/([?&])fmt=[^&]*/g, "$1");

  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}fmt=json3`, { headers: { "User-Agent": UA } });
  if (res.ok) {
    const body = await res.text();
    try {
      const json = JSON.parse(body) as {
        events?: { segs?: { utf8?: string }[] }[];
      };
      const text = (json.events ?? [])
        .flatMap((e) => (e.segs ?? []).map((s) => s.utf8 ?? ""))
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (text) return text;
    } catch {
      // Not JSON — YouTube returned XML instead; parse it directly.
      const text = parseCaptionXml(body);
      if (text) return text;
    }
  }
  const xmlRes = await fetch(url, { headers: { "User-Agent": UA } });
  if (!xmlRes.ok) return "";
  return parseCaptionXml(await xmlRes.text());

}

const INNERTUBE_CLIENTS = [
  {
    key: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "20.10.38",
        androidSdkVersion: 35,
        hl: "en",
      },
    },
    ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 15) gzip",
  },
  {
    key: "AIzaSyB-8OLtTu4pDhQ2bK7ClB6KB_xVvM7X0xY",
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "20.10.4",
        deviceModel: "iPhone16,2",
        hl: "en",
      },
    },
    ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3 like Mac OS X)",
  },
] as const;

async function callInnertube(videoId: string) {
  for (const c of INNERTUBE_CLIENTS) {
    try {
      const res = await fetch(
        `https://www.youtube.com/youtubei/v1/player?key=${c.key}&prettyPrint=false`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": c.ua },
          body: JSON.stringify({ videoId, context: c.context }),
        },
      );
      if (!res.ok) continue;
      const json = (await res.json()) as {
        videoDetails?: { title?: string; lengthSeconds?: string };
        captions?: {
          playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
        };
        streamingData?: {
          adaptiveFormats?: {
            itag?: number;
            mimeType?: string;
            bitrate?: number;
            contentLength?: string;
            url?: string;
          }[];
        };
      };
      return json;
    } catch {
      /* try next client */
    }
  }
  return null;
}

/** Ask YouTube's internal player API for caption tracks (works when the watch HTML has none). */
async function fetchInnertube(
  videoId: string,
): Promise<{ title: string; tracks: CaptionTrack[] } | null> {
  const json = await callInnertube(videoId);
  if (!json) return null;
  const tracks =
    json.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (tracks.length === 0) return null;
  return { title: json.videoDetails?.title ?? "", tracks };
}

// OpenAI transcription upload limit is 25MB.
const WHISPER_MAX_BYTES = 24 * 1024 * 1024;

/**
 * Caption-free fallback: download the video's audio track directly from
 * YouTube's streaming data and transcribe it with OpenAI. Pure fetch, so it
 * runs in the edge runtime (no yt-dlp / child_process).
 */
export async function transcribeYoutubeAudio(videoId: string, apiKey: string): Promise<string> {
  const json = await callInnertube(videoId);
  const formats = (json?.streamingData?.adaptiveFormats ?? []).filter(
    (f) => f.mimeType?.startsWith("audio/") && f.url,
  );
  if (formats.length === 0) return "";

  // Smallest bitrate first so we stay under the 25MB upload limit.
  formats.sort((a, b) => (a.bitrate ?? Infinity) - (b.bitrate ?? Infinity));

  for (const format of formats.slice(0, 4)) {
    try {
      const size = Number(format.contentLength ?? 0);
      const headers: Record<string, string> = { "User-Agent": UA };
      // Cap the download; a partial m4a/webm still decodes the covered minutes.
      if (!size || size > WHISPER_MAX_BYTES) {
        headers["Range"] = `bytes=0-${WHISPER_MAX_BYTES - 1}`;
      }
      const res = await fetch(format.url!, { headers });
      if (!res.ok && res.status !== 206) continue;
      const audio = new Uint8Array(await res.arrayBuffer());
      if (audio.length < 1024) continue;

      const isWebm = format.mimeType!.includes("webm");
      const form = new FormData();
      form.append(
        "file",
        new Blob([audio], { type: isWebm ? "audio/webm" : "audio/mp4" }),
        isWebm ? "youtube-audio.webm" : "youtube-audio.m4a",
      );
      form.append("model", "gpt-4o-mini-transcribe");
      form.append("response_format", "json");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      if (!response.ok) {
        // Surface terminal OpenAI errors instead of masking them as "no captions".
        if (response.status === 401) throw new Error("openai_invalid_key");
        if (response.status === 429) throw new Error("openai_quota");
        continue;
      }

      const json = (await response.json()) as { text?: string };
      const text = (json.text ?? "").replace(/\s{2,}/g, " ").trim();
      if (text) return text;
    } catch {
      /* try next audio format */
    }
  }
  return "";
}

export type YoutubeTranscript = { videoId: string; title: string; text: string };

/** Throws `youtube_invalid_url` or `youtube_no_captions` on failure. */
export async function fetchYoutubeTranscript(
  input: string,
  apiKey?: string,
): Promise<YoutubeTranscript> {
  const videoId = parseYoutubeId(input);
  if (!videoId) throw new Error("youtube_invalid_url");

  let title = "";
  let tracks: CaptionTrack[] = [];

  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
      },
    });
    if (res.ok) {
      const html = await res.text();
      const titleMatch =
        html.match(/<meta\s+name="title"\s+content="([^"]*)"/) ??
        html.match(/<title>([^<]*)<\/title>/);
      title = decodeEntities(titleMatch?.[1] ?? "").replace(/\s*-\s*YouTube$/, "").trim();
      tracks = extractJson<CaptionTrack[]>(html, '"captionTracks"') ?? [];
    }
  } catch {
    /* fall back to innertube */
  }

  if (tracks.length === 0) {
    const alt = await fetchInnertube(videoId);
    if (alt) {
      tracks = alt.tracks;
      title = title || alt.title;
    }
  }

  // Prefer Arabic, then English, then manual, then anything.
  const ordered = [
    tracks.find((tr) => tr.languageCode === "ar" && tr.kind !== "asr"),
    tracks.find((tr) => tr.languageCode === "ar"),
    tracks.find((tr) => tr.languageCode?.startsWith("en") && tr.kind !== "asr"),
    tracks.find((tr) => tr.languageCode?.startsWith("en")),
    tracks.find((tr) => tr.kind !== "asr"),
    ...tracks,
  ].filter((t): t is CaptionTrack => Boolean(t?.baseUrl));

  let text = "";
  const seen = new Set<string>();
  for (const track of ordered) {
    if (seen.has(track.baseUrl)) continue;
    seen.add(track.baseUrl);
    text = await fetchTrackText(track.baseUrl);
    if (text.length >= 40) break;
  }

  // Last-resort captions: YouTube's public timedtext endpoint (works for some
  // videos whose caption tracks are missing from the player response).
  if (text.length < 40) {
    for (const lang of ["ar", "en"]) {
      for (const extra of ["", "&kind=asr"]) {
        text = await fetchTrackText(
          `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}${extra}`,
        );
        if (text.length >= 40) break;
      }
      if (text.length >= 40) break;
    }
  }

  // No captions at all → transcribe the audio itself with OpenAI.
  if (text.length < 40 && apiKey) {
    text = await transcribeYoutubeAudio(videoId, apiKey);
  }

  if (text.length < 40) throw new Error("youtube_no_captions");

  return { videoId, title: title || "YouTube", text: text.slice(0, 40000) };
}
