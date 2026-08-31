/** Server-only helpers to pull a transcript from a YouTube video. */

import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { parseYoutubeId } from "./youtube-url";

export { parseYoutubeId };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const execFileAsync = promisify(execFile);

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

async function fetchTrackText(baseUrl: string): Promise<string> {
  const url = baseUrl.replace(/&amp;/g, "&");
  const res = await fetch(`${url}&fmt=json3`, { headers: { "User-Agent": UA } });
  if (res.ok) {
    const body = await res.text();
    try {
      const json = JSON.parse(body) as {
        events?: { segs?: { utf8?: string }[] }[];
      };
      const text = (json.events ?? [])
        .flatMap((e) => (e.segs ?? []).map((s) => s.utf8 ?? ""))
        .join("")
        .replace(/\n+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (text) return text;
    } catch {
      /* fall through to XML */
    }
  }
  const xmlRes = await fetch(url, { headers: { "User-Agent": UA } });
  if (!xmlRes.ok) return "";
  const xml = await xmlRes.text();
  return [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map((m) => decodeEntities(m[1] ?? "").replace(/<[^>]+>/g, ""))
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function transcribeYoutubeAudio(videoId: string, apiKey: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "subscription-fixer-"));
  const outputTemplate = path.join(dir, "audio.%(ext)s");

  try {
    await execFileAsync(
      "yt-dlp",
      [
        "--no-playlist",
        "--no-progress",
        "--no-warnings",
        "--extract-audio",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "9",
        "--max-filesize",
        "80M",
        "--output",
        outputTemplate,
        `https://www.youtube.com/watch?v=${videoId}`,
      ],
      { timeout: 180_000, maxBuffer: 2 * 1024 * 1024 },
    );

    const audioName = (await readdir(dir)).find((name) => name.endsWith(".mp3"));
    if (!audioName) return "";
    const audio = await readFile(path.join(dir, audioName));
    if (audio.length === 0) return "";

    const form = new FormData();
    form.append("file", new Blob([audio], { type: "audio/mpeg" }), "youtube-audio.mp3");
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("response_format", "json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!response.ok) return "";

    const json = (await response.json()) as { text?: string };
    return (json.text ?? "").replace(/\s{2,}/g, " ").trim();
  } catch {
    return "";
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}


/** Ask YouTube's internal player API for caption tracks (works when the watch HTML has none). */
async function fetchInnertube(
  videoId: string,
): Promise<{ title: string; tracks: CaptionTrack[] } | null> {
  const clients = [
    {
      key: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "19.09.37",
          androidSdkVersion: 30,
          hl: "en",
          },
      },
      ua: "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
    },
    {
      key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      context: { client: { clientName: "WEB", clientVersion: "2.20240401.00.00", hl: "en" } },
      ua: UA,
    },
  ];

  for (const c of clients) {
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
        videoDetails?: { title?: string };
        captions?: {
          playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
        };
      };
      const tracks =
        json.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
      if (tracks.length > 0) {
        return { title: json.videoDetails?.title ?? "", tracks };
      }
    } catch {
      /* try next client */
    }
  }
  return null;
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

  if (text.length < 40 && apiKey) {
    text = await transcribeYoutubeAudio(videoId, apiKey);
  }

  if (text.length < 40) throw new Error("youtube_no_captions");

  return { videoId, title: title || "YouTube", text: text.slice(0, 40000) };
}

