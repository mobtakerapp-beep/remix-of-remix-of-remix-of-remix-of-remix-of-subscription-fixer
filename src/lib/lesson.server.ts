import { uid, type LessonPackage } from "./lesson-types";

type Input = {
  mode: "text" | "pdf" | "image";
  text?: string | undefined;
  fileName?: string | undefined;
  fileData?: string | undefined;
  mediaType?: string | undefined;
  counts: { mcq: number; trueFalse: number; flashcards: number };
  language: "auto" | "ar" | "en";
  numerals: "auto" | "ar" | "en";
  grade: number;
};

type UserPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

const BLOOM_LEVELS = [
  "remember (recall facts, terms, definitions)",
  "understand (explain ideas, summarize, compare)",
  "apply (use information in new situations, solve problems)",
  "analyze (break down causes, relationships, patterns)",
  "evaluate (judge, justify, critique with evidence from the lesson)",
];

const QUESTION_STYLES = [
  "direct recall of a key fact or definition",
  "application in a real-life or classroom scenario",
  "cause-and-effect or chronological reasoning",
  "comparison between two concepts, people, or events",
  "identifying the exception or the incorrect statement",
  "filling in a missing element from a sequence or list",
  "interpreting a number, date, or quantity from the lesson",
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function buildPrompt(data: Input) {
  const langRule =
    data.language === "auto"
      ? "Write the output in the SAME language as the lesson content (Arabic lessons -> Arabic output)."
      : data.language === "ar"
        ? "Write all output in Modern Standard Arabic."
        : "Write all output in English.";

  const numeralRule =
    data.numerals === "ar"
      ? "Write EVERY number, digit, date and math figure using Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩). Never use 0-9."
      : data.numerals === "en"
        ? "Write EVERY number, digit, date and math figure using Western numerals (0123456789). Never use ٠-٩."
        : "Use the numeral system that matches the output language (Arabic output -> Arabic-Indic numerals ٠-٩, English output -> 0-9).";

  const gradeRule = `The learners are in school grade ${data.grade} (of 12). Match vocabulary, sentence length, reasoning depth and difficulty exactly to grade ${data.grade}: very short simple concrete wording for grades 1-3, clear everyday language with light reasoning for grades 4-6, more analysis and precise terminology for grades 7-9, and demanding multi-step / analytical questions for grades 10-12.`;

  // Randomized variety seed so each generation is different
  const seed = Math.floor(Math.random() * 1_000_000);
  const bloomPicks = pickRandom(BLOOM_LEVELS, Math.min(5, data.counts.mcq));
  const stylePicks = pickRandom(QUESTION_STYLES, Math.min(7, data.counts.mcq + data.counts.trueFalse));

  const bloomGuidance = `Distribute the ${data.counts.mcq} MCQs across these cognitive levels (Bloom's taxonomy): ${bloomPicks.join("; ")}. Do NOT make all questions the same type — aim for variety across recall, understanding, application, analysis, and comparison.`;

  const styleGuidance = `Use varied question formats. Include at least some of these styles: ${stylePicks.join("; ")}. Make each question test a DIFFERENT fact or concept from the lesson — never ask about the same information twice.`;

  const coverageGuidance = `Coverage rule: split the lesson into as many distinct parts as there are questions, and take each question from a different part (beginning, middle and end all represented). Never start more than one question with the same opening words or stem pattern. Distractors must be plausible and drawn from the lesson itself (near-miss numbers, related terms, swapped causes) — no obviously silly options, no "all of the above", no options that repeat each other, and keep all four options similar in length.`;

  return `You are an expert teacher assistant. Read the lesson content and build a classroom package.

${langRule}
${numeralRule}
${gradeRule}

VARIETY SEED ${seed}: Use this to ensure the questions differ from any previous generation of the same lesson. Vary wording, correct-option placement, and which facts are tested.

Produce EXACTLY:
- ${data.counts.mcq} multiple choice questions, each with exactly 4 options and the 0-based index of the correct option. ${bloomGuidance} ${styleGuidance} ${coverageGuidance} Randomize the position of the correct answer across the options (don't always put it in the same slot).
- ${data.counts.trueFalse} true/false statements with the correct boolean answer. Include a mix of clearly true, clearly false, and carefully worded statements that require attention to detail (e.g., swapping a number, changing a name, or reversing a cause/effect). Do not reuse facts already tested in the MCQs.
- ${data.counts.flashcards} vocabulary/concept flashcards (term + short definition). Choose the MOST important terms from the lesson that a student must memorize.
- a short lesson title.
- a thorough 10-15 sentence summary covering the lesson's ideas, sequence, examples, causes/results and essential details. Do not skip ANY important fact, number, date, name, or definition from the source. If the lesson lists items (e.g., the 14 sun letters or moon letters), ALL of them must appear in the summary.
- 10-15 complete, useful revision bullet points ("summaryPoints") that capture every key idea, term, example, number, date, and relationship in the lesson. If the source lists items, every item must appear as its own bullet or within a bullet.
- a detailed study-notes summary divided into 4-6 sections ("summarySections"), where every section has a heading and several points, and every point may include nested sub-points. Each section should cover a distinct sub-topic. Each nested point must add useful detail rather than repeat its parent. Include ALL examples, ALL definitions, ALL causes/effects, ALL comparisons, and ALL listed items (e.g., if the lesson enumerates 14 letters, list all 14). Be exhaustive — a student reading only these notes should have the entire lesson.
- 5-7 key highlights.

Questions must be grounded in the lesson content only, age appropriate, clearly worded, and non-repetitive. Avoid asking the exact same fact in multiple questions. Cover as many different parts of the lesson as possible across the full question set.
Set "language" to "ar" if the output text is Arabic, otherwise "en".

Return ONLY a JSON object with this exact shape (no markdown fences):
{"title":string,"summary":string,"summaryPoints":string[],"summarySections":[{"heading":string,"points":[{"text":string,"subPoints":string[]}]}],"highlights":string[],"language":"ar"|"en","mcqs":[{"question":string,"options":string[],"answerIndex":number}],"trueFalse":[{"statement":string,"answer":boolean}],"flashcards":[{"term":string,"definition":string}]}`;
}

// Repairs JSON that was cut off mid-generation (token limit) by closing any
// open string, dropping a dangling fragment, and balancing brackets.
function repairTruncatedJson(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let lastSafe = -1; // index after the last complete value inside a container

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") {
      stack.pop();
      lastSafe = i;
    } else if (ch === ",") lastSafe = i - 1;
  }

  let out = text;
  if (inString || (stack.length > 0 && lastSafe >= 0)) {
    out = text.slice(0, lastSafe + 1);
    // recompute open brackets for the truncated slice
    stack.length = 0;
    let s = false;
    let e = false;
    for (const ch of out) {
      if (s) {
        if (e) e = false;
        else if (ch === "\\") e = true;
        else if (ch === '"') s = false;
        continue;
      }
      if (ch === '"') s = true;
      else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
      else if (ch === "}" || ch === "]") stack.pop();
    }
  }
  out = out.replace(/,\s*$/, "");
  while (stack.length > 0) out += stack.pop();
  return out;
}

function extractJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    if (start === -1) throw new Error("The AI response could not be read. Try again.");
    const end = cleaned.lastIndexOf("}");
    const candidate = end > start ? cleaned.slice(start, end + 1) : cleaned.slice(start);
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        return JSON.parse(repairTruncatedJson(cleaned.slice(start)));
      } catch {
        throw new Error("The AI response was incomplete. Please try again.");
      }
    }
  }
}


/* eslint-disable @typescript-eslint/no-explicit-any */
function normalize(parsed: any, data: Input): LessonPackage {
  const counts = data.counts;
  const mcqs = (Array.isArray(parsed?.mcqs) ? parsed.mcqs : [])
    .filter((m: any) => m?.question && Array.isArray(m?.options) && m.options.length >= 2)
    .slice(0, counts.mcq)
    .map((m: any) => ({
      id: uid(),
      question: String(m.question),
      options: m.options.slice(0, 6).map((o: unknown) => String(o)),
      answerIndex: Math.max(0, Math.min(Number(m.answerIndex) || 0, m.options.length - 1)),
    }));

  const trueFalse = (Array.isArray(parsed?.trueFalse) ? parsed.trueFalse : [])
    .filter((t: any) => t?.statement)
    .slice(0, counts.trueFalse)
    .map((t: any) => ({ id: uid(), statement: String(t.statement), answer: Boolean(t.answer) }));

  const flashcards = (Array.isArray(parsed?.flashcards) ? parsed.flashcards : [])
    .filter((f: any) => f?.term)
    .slice(0, counts.flashcards)
    .map((f: any) => ({
      id: uid(),
      term: String(f.term),
      definition: String(f.definition ?? ""),
    }));

  if (!mcqs.length && !trueFalse.length && !flashcards.length) {
    throw new Error("No questions could be generated from this content.");
  }

  const summarySections = (Array.isArray(parsed?.summarySections) ? parsed.summarySections : [])
    .map((section: any) => ({
      heading: String(section?.heading ?? "").trim(),
      points: (Array.isArray(section?.points) ? section.points : [])
        .map((point: any) => {
          if (typeof point === "string") return { text: point.trim(), subPoints: [] };
          return {
            text: String(point?.text ?? point?.point ?? point?.content ?? "").trim(),
            subPoints: (Array.isArray(point?.subPoints) ? point.subPoints : [])
              .map((subPoint: unknown) => String(subPoint).trim())
              .filter((subPoint: string) => subPoint.length > 0),
          };
        })
        .filter((point: { text: string }) => point.text.length > 0),
    }))
    .filter((section: { heading: string; points: unknown[] }) => section.heading.length > 0 && section.points.length > 0)
    .slice(0, 6);

  return {
    title: String(parsed?.title ?? "Lesson"),
    summary: String(parsed?.summary ?? ""),
    summaryPoints: (Array.isArray(parsed?.summaryPoints) ? parsed.summaryPoints : [])
      .slice(0, 15)
      .map((h: unknown) => String(h))
      .filter((h: string) => h.trim().length > 0),
    summarySections,
    highlights: (Array.isArray(parsed?.highlights) ? parsed.highlights : [])
      .slice(0, 7)
      .map((h: unknown) => String(h)),
    language: parsed?.language === "ar" ? "ar" : "en",
    numerals:
      data.numerals === "auto"
        ? parsed?.language === "ar"
          ? "ar"
          : "en"
        : data.numerals,
    grade: data.grade,
    mcqs,
    trueFalse,
    flashcards,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function buildLessonPackage(data: Input, apiKey: string): Promise<LessonPackage> {
  const parts: UserPart[] = [{ type: "text", text: buildPrompt(data) }];

  if (data.mode === "text") {
    const text = (data.text ?? "").trim();
    if (!text) throw new Error("Lesson text is empty.");
    parts.push({ type: "text", text: `LESSON CONTENT:\n${text.slice(0, 60000)}` });
  } else {
    if (!data.fileData || !data.mediaType) throw new Error("No file was provided.");
    const dataUrl = data.fileData.startsWith("data:")
      ? data.fileData
      : `data:${data.mediaType};base64,${data.fileData}`;
    if (data.mode === "image") {
      parts.push({ type: "image_url", image_url: { url: dataUrl } });
    } else {
      parts.push({
        type: "file",
        file: { filename: data.fileName ?? "lesson.pdf", file_data: dataUrl },
      });
    }
    parts.push({
      type: "text",
      text: "The attached file is the lesson content. Read all of its text (use OCR if it is a photo of a page).",
    });
  }

  const inputContent = parts.map((part) => {
    if (part.type === "text") return { type: "input_text" as const, text: part.text };
    if (part.type === "image_url") {
      return { type: "input_image" as const, image_url: part.image_url.url };
    }
    return {
      type: "input_file" as const,
      filename: part.file.filename,
      file_data: part.file.file_data,
    };
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      input: [{ role: "user", content: inputContent }],
      text: { format: { type: "json_object" } },
      max_output_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 429) throw new Error("Too many requests right now. Please wait a moment and try again.");
    if (response.status === 401) throw new Error("The OpenAI key was rejected. Check the project secret.");
    throw new Error(`AI request failed (${response.status}). ${detail.slice(0, 300)}`);
  }

  const json = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };
  const text =
    json.output_text ??
    json.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text ?? "")
      .join("") ??
    "";
  if (!text.trim()) throw new Error("The AI returned an empty response. Please try again.");
  return normalize(extractJson(text), data);
}
