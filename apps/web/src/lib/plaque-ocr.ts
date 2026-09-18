// Reconnaissance de plaque signalétique par OCR (Google Cloud Vision).
// L'OCR classique ne renvoie que du texte brut : on applique ensuite des
// heuristiques pour proposer une valeur par champ, mais elles restent des
// suggestions à valider par la personne qui saisit — jamais appliquées
// silencieusement.
import type { PlaqueSignaletiqueChamp } from "./types";

export async function callGoogleVisionOcr(base64Image: string): Promise<string> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    throw new Error(
      "La reconnaissance de plaque n'est pas configurée (clé API Google Cloud Vision manquante).",
    );
  }

  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64Image },
          features: [{ type: "TEXT_DETECTION" }],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Erreur Google Cloud Vision (${res.status}).`);

  const json = await res.json();
  const responseError = json.responses?.[0]?.error;
  if (responseError) throw new Error(responseError.message ?? "Erreur de reconnaissance de la plaque.");

  return json.responses?.[0]?.fullTextAnnotation?.text ?? "";
}

export interface PlaqueGuess {
  value: string;
  /** Confiance heuristique (0-1) : ce n'est pas un score d'IA, juste un indice
   * de fiabilité du motif utilisé (libellé trouvé à côté ou non, format
   * attendu...). */
  confidence: number;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .toLowerCase();
}

// Synonymes usuels imprimés sur les plaques, en plus du libellé/clé du champ
// lui-même (qui sert toujours de synonyme de base, ex: "puissance" pour
// puissance_kw). Complète les cas où le mot imprimé diffère beaucoup du
// libellé interne (ex: "S/N" pour numero_serie).
const EXTRA_SYNONYMS: Record<string, string[]> = {
  marque: ["brand", "manufacturer", "fabricant", "make"],
  modele: ["model", "modele", "type", "ref", "reference"],
  numero_serie: ["s/n", "sn", "serie", "serial"],
  num_serie: ["s/n", "sn", "serie", "serial"],
  numero_installation: ["immatriculation", "installation"],
  annee_fabrication: ["annee", "fabrication", "year"],
};

// Position d'une occurrence de `needle` dans `haystack` qui ne commence pas
// au milieu d'un mot plus long (évite par ex. que "sn" matche à l'intérieur
// d'un mot quelconque). La valeur peut en revanche suivre directement sans
// séparateur (ex: "SN123456"), donc on ne contraint que le caractère avant.
function findWholeToken(haystack: string, needle: string): number {
  let from = 0;
  while (from <= haystack.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return -1;
    const before = idx > 0 ? haystack[idx - 1] : "";
    if (!/[a-z0-9]/i.test(before)) return idx;
    from = idx + 1;
  }
  return -1;
}

function synonymsFor(champ: PlaqueSignaletiqueChamp): string[] {
  const fullLabel = normalize(champ.label).replace(/[^a-z0-9]+/g, " ").trim();
  const fromLabel = fullLabel.split(" ").filter((w) => w.length > 2);
  const fromKey = normalize(champ.key.replace(/_/g, " "))
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
  const extra = EXTRA_SYNONYMS[champ.key] ?? [];
  const all = Array.from(new Set([fullLabel, ...fromLabel, ...fromKey, ...extra])).filter(Boolean);
  // Les synonymes les plus longs (ex: la phrase complète du libellé) sont
  // essayés en premier : ça évite de ne matcher qu'un seul mot d'un libellé
  // à plusieurs mots et de laisser l'autre mot trainer dans la valeur.
  return all.sort((a, b) => b.length - a.length);
}

function cleanCandidate(raw: string, champ: PlaqueSignaletiqueChamp): string | undefined {
  let value = raw.trim().replace(/^[:\-=.\s]+/, "").trim();
  if (!value) return undefined;
  if (champ.type === "number") {
    const match = /[0-9]+(?:[.,][0-9]+)?/.exec(value);
    if (!match) return undefined;
    value = match[0].replace(",", ".");
  }
  if (value.length > 60) return undefined; // ligne trop longue, probablement pas la bonne
  return value;
}

// Cherche, ligne par ligne dans le texte détecté, un libellé connu suivi
// (sur la même ligne, ou sinon la ligne suivante) de la valeur.
function guessByLabel(champ: PlaqueSignaletiqueChamp, lines: string[]): PlaqueGuess | undefined {
  const synonyms = synonymsFor(champ);
  if (synonyms.length === 0) return undefined;

  for (let i = 0; i < lines.length; i++) {
    const normalizedLine = normalize(lines[i]);
    for (const syn of synonyms) {
      const idx = findWholeToken(normalizedLine, syn);
      if (idx === -1) continue;

      const after = lines[i].slice(idx + syn.length);
      const sameLine = cleanCandidate(after, champ);
      if (sameLine) return { value: sameLine, confidence: /^[\s:\-=]/.test(after) ? 0.85 : 0.6 };

      const nextLine = lines[i + 1];
      if (nextLine) {
        const candidate = cleanCandidate(nextLine, champ);
        if (candidate) return { value: candidate, confidence: 0.65 };
      }
    }
  }
  return undefined;
}

function guessSelectOption(champ: PlaqueSignaletiqueChamp, rawText: string): PlaqueGuess | undefined {
  if (champ.type !== "select" || !champ.options) return undefined;
  const normalizedText = normalize(rawText);
  for (const option of champ.options) {
    if (normalizedText.includes(normalize(option))) return { value: option, confidence: 0.9 };
  }
  return undefined;
}

const YEAR_RE = /\b(19[5-9]\d|20[0-3]\d)\b/;
const SERIAL_RE = /\b(?:n[°o]?|s\/n|sn|ser(?:ial)?)\s*[:.]?\s*([a-z0-9][a-z0-9\-./]{3,})/i;

function guessAnneeFallback(text: string): PlaqueGuess | undefined {
  const bare = YEAR_RE.exec(text);
  return bare ? { value: bare[1], confidence: 0.4 } : undefined;
}

function guessSerialFallback(text: string): PlaqueGuess | undefined {
  const match = SERIAL_RE.exec(text);
  if (!match) return undefined;
  const value = match[1].toUpperCase();
  const looksSolid = /[0-9]/.test(value) && /[A-Z]/.test(value) && value.length >= 5;
  return { value, confidence: looksSolid ? 0.55 : 0.4 };
}

function guessMeasurementFallback(text: string, unit: string): PlaqueGuess | undefined {
  const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`([0-9]+(?:[.,][0-9]+)?)\\s*${escapedUnit}\\b`, "i");
  const match = re.exec(text);
  if (!match) return undefined;
  return { value: match[1].replace(",", "."), confidence: 0.55 };
}

function guessFallback(champ: PlaqueSignaletiqueChamp, rawText: string): PlaqueGuess | undefined {
  if (champ.type === "number" && /annee/i.test(champ.key)) return guessAnneeFallback(rawText);
  if (champ.type === "text" && /(numero_serie|num_serie|numero_installation)/i.test(champ.key)) {
    return guessSerialFallback(rawText);
  }
  if (champ.type === "number" && champ.unit) return guessMeasurementFallback(rawText, champ.unit);
  return undefined;
}

// Ne renvoie que des suggestions : c'est à la personne qui saisit de
// choisir, champ par champ, de les accepter ou de les ignorer.
export function guessPlaqueValues(
  schema: PlaqueSignaletiqueChamp[],
  rawText: string,
): Record<string, PlaqueGuess> {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const guesses: Record<string, PlaqueGuess> = {};

  for (const champ of schema) {
    const guess = guessSelectOption(champ, rawText) ?? guessByLabel(champ, lines) ?? guessFallback(champ, rawText);
    if (guess) guesses[champ.key] = guess;
  }
  return guesses;
}
