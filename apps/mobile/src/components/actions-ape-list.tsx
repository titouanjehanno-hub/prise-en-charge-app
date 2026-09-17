import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ActionApe } from "@/lib/types";

interface ActionsApeListProps {
  items: ActionApe[];
  onAdd: (description: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  placeholder?: string;
}

export function ActionsApeList({ items, onAdd, onDelete, placeholder }: ActionsApeListProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd() {
    const description = text.trim();
    if (!description) return;
    setIsSubmitting(true);
    try {
      await onAdd(description);
      setText("");
    } catch {
      Alert.alert("Erreur", "Impossible d'ajouter cette remarque.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDelete(id: string) {
    Alert.alert("Supprimer cette remarque ?", undefined, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => onDelete(id) },
    ]);
  }

  return (
    <View style={{ gap: 8 }}>
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          <Text style={styles.itemText}>{item.description}</Text>
          <Pressable onPress={() => handleDelete(item.id)}>
            <Text style={styles.deleteText}>×</Text>
          </Pressable>
        </View>
      ))}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder ?? "ex : Gestion de la consigne sur la GTB"}
          multiline
        />
        <Pressable
          style={[styles.addButton, isSubmitting && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={isSubmitting}
        >
          <Text style={styles.addButtonText}>{isSubmitting ? "..." : "Ajouter"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccfbf1",
    backgroundColor: "#f0fdfa",
    padding: 10,
  },
  itemText: { flex: 1, fontSize: 13, color: "#134e4a" },
  deleteText: { fontSize: 16, color: "#0f766e", fontWeight: "700", paddingHorizontal: 4 },
  addRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: "#fff",
    minHeight: 40,
  },
  addButton: {
    backgroundColor: "#0f766e",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
