import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BigButton } from '@/components/BigButton';
import { IdeaEtching } from '@/components/IdeaEtching';
import { deleteMoment, type MomentWithIdea } from '@/lib/db/database';
import { hapticReveal } from '@/lib/haptics';
import { pickAndAttachPhoto, rateMoment, setMomentNote } from '@/lib/momentActions';
import { accent, borders, capsLabel, fonts, ideaHue, ink, inkFaint, inkHead, line, rule, surface } from '@/lib/theme';

interface Props {
  entry: MomentWithIdea | null; // null = closed
  /** The list refreshes itself after any change. */
  onChanged: () => void;
  onClose: () => void;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

export function JournalEntrySheet({ entry, onChanged, onClose }: Props) {
  const [draft, setDraft] = useState('');
  const [rating, setRating] = useState<number | null>(null);

  // Sync the editable fields each time a different entry opens (state-
  // adjustment-during-render pattern; avoids an effect).
  const [openId, setOpenId] = useState<string | null>(null);
  const entryId = entry?.moment.id ?? null;
  if (entryId !== openId) {
    setOpenId(entryId);
    if (entry) {
      setDraft(entry.moment.note ?? '');
      setRating(entry.moment.rating ?? null);
    }
  }

  if (!entry) {
    return null;
  }

  const { moment, idea } = entry;
  const hue = ideaHue(idea.moods);

  const rate = (stars: 1 | 2 | 3 | 4 | 5) => {
    rateMoment(moment.id, stars);
    hapticReveal();
    setRating(stars);
    onChanged();
  };

  const saveNote = () => {
    setMomentNote(moment.id, draft.trim());
    onChanged();
    onClose();
  };

  const addPhoto = async () => {
    if (await pickAndAttachPhoto(moment.id)) onChanged();
  };

  const confirmRemove = () => {
    Alert.alert('Tear out this page?', `“${idea.title}” will leave your journal for good.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          deleteMoment(moment.id);
          onChanged();
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close entry">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable onPress={() => {}} style={styles.sheet}>
            <IdeaEtching icon={idea.icon} hue={hue} size={200} opacity={0.09} />
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <Text style={[capsLabel, { color: hue }]}>
                {formatDateTime(moment.confirmedAt ?? moment.createdAt)}
              </Text>
              <Text style={styles.title}>{idea.title}</Text>

              <View style={styles.starRow}>
                {([1, 2, 3, 4, 5] as const).map((stars) => (
                  <Pressable
                    key={stars}
                    accessibilityRole="button"
                    accessibilityLabel={`Rate ${stars} star${stars > 1 ? 's' : ''}`}
                    onPress={() => rate(stars)}
                    hitSlop={6}
                    style={styles.star}
                  >
                    <Text style={[styles.starText, !(rating && stars <= rating) && styles.starDim]}>
                      ★
                    </Text>
                  </Pressable>
                ))}
              </View>

              {moment.photoUri ? (
                <Image
                  source={{ uri: moment.photoUri }}
                  style={styles.photo}
                  contentFit="cover"
                  accessibilityLabel="Your photo of this moment"
                />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={addPhoto}
                  style={({ pressed }) => [styles.photoLink, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.photoLinkText}>Add a photograph →</Text>
                </Pressable>
              )}

              <Text style={styles.noteLabel}>For future you</Text>
              <TextInput
                style={styles.noteInput}
                multiline
                placeholder="How was it, really? What would you tell yourself next time?"
                placeholderTextColor={inkFaint}
                value={draft}
                onChangeText={setDraft}
                maxLength={500}
                accessibilityLabel="Your note about this moment"
              />

              <View style={styles.buttons}>
                <BigButton label="Save" onPress={saveNote} />
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmRemove}
                  style={({ pressed }) => [styles.removeLink, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.removeText}>remove from journal</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 8, 6, 0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: surface,
    borderTopWidth: 1,
    borderTopColor: line,
    borderTopLeftRadius: borders.radius * 2,
    borderTopRightRadius: borders.radius * 2,
    overflow: 'hidden', // crops the etching
    maxHeight: '88%',
  },
  content: {
    padding: 26,
    paddingBottom: 34,
    gap: 10,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 25,
    lineHeight: 31,
    color: inkHead,
  },
  starRow: {
    flexDirection: 'row',
  },
  star: {
    minWidth: 36,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    fontSize: 21,
    color: accent,
  },
  starDim: {
    color: rule,
  },
  photo: {
    height: 160,
    borderRadius: borders.radiusSmall,
  },
  photoLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  photoLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: accent,
    letterSpacing: 0.3,
  },
  noteLabel: {
    ...capsLabel,
    marginTop: 4,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: borders.radiusSmall,
    backgroundColor: 'rgba(0, 0, 0, 0.14)',
    padding: 14,
    minHeight: 110,
    textAlignVertical: 'top',
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    lineHeight: 22,
    color: ink,
  },
  buttons: {
    gap: 6,
    marginTop: 8,
  },
  removeLink: {
    alignSelf: 'center',
    padding: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  removeText: {
    fontSize: 13,
    fontWeight: '600',
    color: inkFaint,
    letterSpacing: 0.3,
  },
});
