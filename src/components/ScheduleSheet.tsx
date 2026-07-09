import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { Chip } from '@/components/Chip';
import { borders, capsLabel, fonts, iconWell, ink, inkFaint, inkHead, inkSoft, line, surface } from '@/lib/theme';

interface Props {
  visible: boolean;
  ideaTitle: string;
  /** Pre-fill when editing an existing schedule. */
  initial?: Date | null;
  /** Confirmed with a date, or null for "skip for now" (unscheduled). */
  onConfirm: (date: Date | null) => void;
  onClose: () => void;
}

function defaultTime(): Date {
  // A friendly default: two hours from now, rounded up to the half hour.
  const date = new Date(Date.now() + 2 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() + ((30 - (date.getMinutes() % 30)) % 30), 0, 0);
  return date;
}

function dayLabel(offset: number, date: Date): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function ScheduleSheet({ visible, ideaTitle, initial, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState<Date>(initial ?? defaultTime());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Reset the selection each time the sheet opens (state-adjustment-during-
  // render pattern; avoids an effect).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setSelected(initial ?? defaultTime());
      setShowTimePicker(false);
    }
  }

  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return { offset, date };
  });

  const pickDay = (date: Date) => {
    const next = new Date(selected);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setSelected(next);
  };

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'set' && date) {
      const next = new Date(selected);
      next.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setSelected(next);
    }
  };

  const timeLabel = selected.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close scheduling">
        <Pressable onPress={() => {}} style={styles.sheet}>
          <Text style={capsLabel}>Setting the scene</Text>
          <Text style={styles.title}>When are we doing this?</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {ideaTitle}
          </Text>

          <View style={styles.dayRow}>
            {days.map(({ offset, date }) => (
              <Chip
                key={offset}
                label={dayLabel(offset, date)}
                selected={sameDay(selected, date)}
                onPress={() => pickDay(date)}
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change time, currently ${timeLabel}`}
            onPress={() => setShowTimePicker(true)}
            style={({ pressed }) => [styles.timeButton, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.timeLabel}>{timeLabel}</Text>
            <Text style={styles.timeHint}>tap to change</Text>
          </Pressable>

          {showTimePicker && (
            <DateTimePicker
              value={selected}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="dark"
              onChange={onTimeChange}
            />
          )}

          <View style={styles.buttons}>
            <BigButton label="Lock it in" onPress={() => onConfirm(selected)} />
            <Pressable
              accessibilityRole="button"
              onPress={() => onConfirm(null)}
              style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.skipText}>whenever — skip for now</Text>
            </Pressable>
          </View>
        </Pressable>
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
    padding: 26,
    paddingBottom: 34,
    gap: 12,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 24,
    lineHeight: 30,
    color: inkHead,
  },
  subtitle: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: inkSoft,
    marginTop: -6,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: iconWell,
    borderWidth: 1,
    borderColor: line,
    borderRadius: borders.radiusSmall,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  timeLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: ink,
    fontVariant: ['tabular-nums'],
  },
  timeHint: {
    fontSize: 12.5,
    color: inkFaint,
  },
  buttons: {
    gap: 6,
    marginTop: 8,
  },
  skip: {
    alignSelf: 'center',
    padding: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: inkSoft,
  },
});
