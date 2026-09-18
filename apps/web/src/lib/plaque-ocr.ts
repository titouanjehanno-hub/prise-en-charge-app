// Reconnaissance de plaque signalétique par OCR (Google Cloud Vision).
// L'OCR classique ne renvoie que du texte brut : on applique ensuite des
// heuristiques simples pour proposer des valeurs par champ, mais elles
// restent des suggestions à vérifier par la personne qui saisit — jamais
// appliquées silencieusement sur un champ déjà rempli.
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

const YEAR_RE = /\b(19[5-9]\d|20[0-3]\d)\b/;
const YEAR_CONTEXT_RE = /(ann[ée]e|fabrication|year|date)[^0-9]{0,20}(19[5-9]\d|20[0-3]\d)/i;
const SERIAL_RE = /(?:n[°o]?|s\/n|sn|ser(?:ial)?)\s*[:.]?\s*([a-z0-9][a-z0-9\-./]{3,})/i;

export interface PlaqueGuess {
  value: string;
  /** Confiance heuristique (0-1) : ce n'est pas un score d'IA, juste un indice
   * de fiabilité du motif utilisé (contexte trouvé ou non, format attendu...). */
  confidence: number;
}

function guessAnnee(text: string): PlaqueGuess | undefined {
  const withContext = YEAR_CONTEXT_RE.exec(text);
  if (withContext) return { value: withContext[2], confidence: 0.85 };
  const bare = YEAR_RE.exec(text);
  if (bare) return { value: bare[1], confidence: 0.45 };
  return undefined;
}

function guessSerial(text: string): PlaqueGuess | undefined {
  const match = SERIAL_RE.exec(text);
  if (!match) return undefined;
  const value = match[1].toUpperCase();
  const looksSolid = /[0-9]/.test(value) && /[A-Z]/.test(value) && value.length >= 5;
  return { value, confidence: looksSolid ? 0.8 : 0.6 };
}

function guessMeasurement(text: string, unit: string): PlaqueGuess | undefined {
  const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`([0-9]+(?:[.,][0-9]+)?)\\s*${escapedUnit}\\b`, "i");
  const match = re.exec(text);
  if (!match) return undefined;
  return { value: match[1].replace(",", "."), confidence: 0.75 };
}

// Ne renvoie que des suggestions : c'est à la personne qui saisit de
// choisir, champ par champ, de les accepter ou de les ignorer.
export function guessPlaqueValues(
  schema: PlaqueSignaletiqueChamp[],
  rawText: string,
): Record<string, PlaqueGuess> {
  const guesses: Record<string, PlaqueGuess> = {};
  for (const champ of schema) {
    let guess: PlaqueGuess | undefined;
    if (champ.type === "number" && /annee/i.test(champ.key)) {
      guess = guessAnnee(rawText);
    } else if (champ.type === "text" && /(numero_serie|num_serie|numero_installation)/i.test(champ.key)) {
      guess = guessSerial(rawText);
    } else if (champ.type === "number" && champ.unit) {
      guess = guessMeasurement(rawText, champ.unit);
    }
    if (guess) guesses[champ.key] = guess;
  }
  return guesses;
}
