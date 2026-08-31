export type MCQ = {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
};

export type TrueFalse = {
  id: string;
  statement: string;
  answer: boolean;
};

export type Flashcard = {
  id: string;
  term: string;
  definition: string;
};

export type SummaryPoint = {
  text: string;
  subPoints: string[];
};

export type SummarySection = {
  heading: string;
  points: SummaryPoint[];
};

export type LessonPackage = {
  title: string;
  summary: string;
  /** Short bullet-point summary of the lesson. */
  summaryPoints: string[];
  /** Detailed, study-notes style summary grouped into sections. */
  summarySections: SummarySection[];
  highlights: string[];
  language: "ar" | "en";
  /** Which digit system to render numbers in. */
  numerals: "ar" | "en";
  /** Target school grade (1-12) used for difficulty. */
  grade: number;
  mcqs: MCQ[];
  trueFalse: TrueFalse[];
  flashcards: Flashcard[];
};

export const emptyPackage: LessonPackage = {
  title: "",
  summary: "",
  summaryPoints: [],
  summarySections: [],
  highlights: [],
  language: "en",
  numerals: "en",
  grade: 5,
  mcqs: [],
  trueFalse: [],
  flashcards: [],
};

export function isRtl(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export type Numerals = "ar" | "en";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const AR_OPTION_LETTERS = ["أ", "ب", "ج", "د", "هـ", "و"];

/** Convert digits inside any value to Arabic-Indic or Western numerals. */
export function fmtNum(value: number | string, numerals: Numerals) {
  const s = String(value);
  return numerals === "ar"
    ? s.replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)] ?? d)
    : s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

/** Option label: أ ب ج د for Arabic, A B C D for English. */
export function optionLetter(index: number, language: "ar" | "en") {
  return language === "ar"
    ? (AR_OPTION_LETTERS[index] ?? String(index + 1))
    : String.fromCharCode(65 + index);
}
