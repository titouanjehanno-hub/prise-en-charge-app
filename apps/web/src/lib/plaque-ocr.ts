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
const SERIAL_RE = /(?:n[°o]?|s\/n|sn|ser(?:ial)?)\s*[:.]?\s*([a-z0-9][a-z0-9\-./]{3,})/i;

function guessMeasurement(text: string, unit: string): string | undefined {
  const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`([0-9]+(?:[.,][0-9]+)?)\\s*${escapedUnit}\\b`, "i");
  const match = re.exec(text);
  return match ? match[1].replace(",", ".") : undefined;
}

// Retourne uniquement des suggestions pour des champs vides côté formulaire :
// à l'appelant de ne pas écraser une valeur déjà saisie.
export function guessPlaqueValues(
  schema: PlaqueSignaletiqueChamp[],
  rawText: string,
): Record<string, string> {
  const guesses: Record<string, string> = {};
  for (const champ of schema) {
    if (champ.type === "number" && /annee/i.test(champ.key)) {
      const match = YEAR_RE.exec(rawText);
      if (match) guesses[champ.key] = match[1];
    } else if (champ.type === "text" && /(numero_serie|num_serie|numero_installation)/i.test(champ.key)) {
      const match = SERIAL_RE.exec(rawText);
      if (match) guesses[champ.key] = match[1].toUpperCase();
    } else if (champ.type === "number" && champ.unit) {
      const value = guessMeasurement(rawText, champ.unit);
      if (value) guesses[champ.key] = value;
    }
  }
  return guesses;
}
