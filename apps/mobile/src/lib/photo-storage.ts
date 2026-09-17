import { File, Paths } from "expo-file-system";

// Copie une photo (venant d'ImagePicker, souvent dans un cache éphémère) vers
// le dossier document persistant de l'app, pour qu'elle survive même si
// l'upload vers Supabase n'a pas encore eu lieu (mode hors-ligne).
export function persistPickedPhoto(pickedUri: string, id: string, extension: string): string {
  const source = new File(pickedUri);
  const dest = new File(Paths.document, `photo-${id}.${extension}`);
  source.copy(dest);
  return dest.uri;
}

export function deleteLocalPhotoFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // best effort : si le fichier n'existe déjà plus, tant mieux
  }
}
