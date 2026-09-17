import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { deletePhoto, getPhotos, uploadPhoto } from "@/lib/data";
import type { Photo, PhotoType } from "@/lib/types";

interface PhotoGalleryProps {
  equipementReleveId?: string;
  onNeedsSave: () => Promise<string>;
}

const TYPE_LABEL: Record<PhotoType, string> = {
  generale: "Générale",
  plaque_signaletique: "Plaque signalétique",
  defaut: "Défaut",
};

export function PhotoGallery({ equipementReleveId, onNeedsSave }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(!!equipementReleveId);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingType, setPendingType] = useState<PhotoType>("plaque_signaletique");

  useEffect(() => {
    if (!equipementReleveId) return;
    setIsLoading(true);
    getPhotos(equipementReleveId)
      .then(setPhotos)
      .finally(() => setIsLoading(false));
  }, [equipementReleveId]);

  async function pickAndUpload(source: "camera" | "library") {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission refusée", "Impossible d'accéder à la caméra ou à la galerie.");
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });

    if (result.canceled || !result.assets?.[0]) return;

    setIsUploading(true);
    try {
      const releveId = equipementReleveId ?? (await onNeedsSave());
      const photo = await uploadPhoto(releveId, pendingType, result.assets[0].uri);
      setPhotos((prev) => [...prev, photo]);
    } catch {
      Alert.alert("Erreur", "Impossible d'envoyer la photo.");
    } finally {
      setIsUploading(false);
    }
  }

  function choosePhotoSource() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Annuler", "Prendre une photo", "Choisir dans la galerie"], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) pickAndUpload("camera");
          if (index === 2) pickAndUpload("library");
        },
      );
    } else {
      Alert.alert("Ajouter une photo", undefined, [
        { text: "Annuler", style: "cancel" },
        { text: "Prendre une photo", onPress: () => pickAndUpload("camera") },
        { text: "Choisir dans la galerie", onPress: () => pickAndUpload("library") },
      ]);
    }
  }

  function confirmDelete(photo: Photo) {
    Alert.alert("Supprimer cette photo ?", undefined, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePhoto(photo);
            setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
          } catch {
            Alert.alert("Erreur", "Impossible de supprimer cette photo.");
          }
        },
      },
    ]);
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.typeRow}>
        {(Object.keys(TYPE_LABEL) as PhotoType[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.typeChip, pendingType === t && styles.typeChipActive]}
            onPress={() => setPendingType(t)}
          >
            <Text style={[styles.typeChipText, pendingType === t && styles.typeChipTextActive]}>
              {TYPE_LABEL[t]}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {isLoading && <ActivityIndicator style={styles.thumb} />}
        {photos.map((photo) => (
          <View key={photo.id} style={styles.thumbWrapper}>
            <Image source={{ uri: photo.url }} style={styles.thumb} />
            <Pressable style={styles.deleteBadge} onPress={() => confirmDelete(photo)}>
              <Text style={styles.deleteBadgeText}>×</Text>
            </Pressable>
            <Text style={styles.thumbLabel} numberOfLines={1}>
              {TYPE_LABEL[photo.type]}
            </Text>
          </View>
        ))}
        <Pressable style={styles.addThumb} onPress={choosePhotoSource} disabled={isUploading}>
          {isUploading ? <ActivityIndicator /> : <Text style={styles.addThumbText}>+ Photo</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  typeChipActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  typeChipText: { fontSize: 12, color: "#334155" },
  typeChipTextActive: { color: "#fff", fontWeight: "600" },
  row: { gap: 10, paddingVertical: 4 },
  thumbWrapper: { alignItems: "center", gap: 4, width: 84 },
  thumb: { width: 84, height: 84, borderRadius: 8, backgroundColor: "#e2e8f0" },
  thumbLabel: { fontSize: 10, color: "#64748b", maxWidth: 84, textAlign: "center" },
  deleteBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBadgeText: { color: "#fff", fontSize: 14, fontWeight: "700", lineHeight: 16 },
  addThumb: {
    width: 84,
    height: 84,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addThumbText: { fontSize: 12, color: "#4f46e5", fontWeight: "600" },
});
