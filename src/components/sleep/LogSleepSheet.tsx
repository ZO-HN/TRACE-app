import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import Button from '../ui/Button';

const QUALITIES = [1, 2, 3, 4, 5] as const;

// No native time-picker dependency (e.g. @react-native-community/
// datetimepicker) is installed in this app, and adding one risks breaking
// the Expo web preview used to verify changes (it has no reliable web
// build). Hour/minute/AM-PM fields below are plain text inputs instead of
// a native wheel picker — same data captured, lower-risk implementation.
function TimeField({
  label,
  hour,
  minute,
  amPm,
  onHour,
  onMinute,
  onAmPm,
}: {
  label: string;
  hour: string;
  minute: string;
  amPm: 'AM' | 'PM';
  onHour: (v: string) => void;
  onMinute: (v: string) => void;
  onAmPm: (v: 'AM' | 'PM') => void;
}) {
  return (
    <View className="bg-surface border border-border rounded-xl px-4 py-3 gap-2">
      <Text className="text-gray-400 text-sm">{label}</Text>
      <View className="flex-row items-center gap-2">
        <TextInput
          value={hour}
          onChangeText={onHour}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="10"
          placeholderTextColor="#6B7280"
          className="w-14 h-10 bg-background border border-border rounded-lg px-2 text-center text-white font-bold"
        />
        <Text className="text-white font-bold">:</Text>
        <TextInput
          value={minute}
          onChangeText={onMinute}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="57"
          placeholderTextColor="#6B7280"
          className="w-14 h-10 bg-background border border-border rounded-lg px-2 text-center text-white font-bold"
        />
        <View className="flex-row ml-2">
          {(['AM', 'PM'] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() => onAmPm(p)}
              className={`px-3 h-10 items-center justify-center border border-border ${
                p === 'AM' ? 'rounded-l-lg' : 'rounded-r-lg -ml-px'
              } ${amPm === p ? 'bg-primary/20 border-primary' : 'bg-background'}`}
            >
              <Text className={`text-xs font-bold ${amPm === p ? 'text-primary' : 'text-gray-500'}`}>
                {p}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function to24Hour(hour12: number, amPm: 'AM' | 'PM'): number {
  const h = hour12 % 12;
  return amPm === 'PM' ? h + 12 : h;
}

export default function LogSleepSheet({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (bedtime: Date, wakeTime: Date, quality: 1 | 2 | 3 | 4 | 5) => Promise<void>;
}) {
  const now = new Date();
  const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);

  const [bedHour, setBedHour] = useState(String(eightHoursAgo.getHours() % 12 || 12));
  const [bedMinute, setBedMinute] = useState(String(eightHoursAgo.getMinutes()).padStart(2, '0'));
  const [bedAmPm, setBedAmPm] = useState<'AM' | 'PM'>(eightHoursAgo.getHours() >= 12 ? 'PM' : 'AM');

  const [wakeHour, setWakeHour] = useState(String(now.getHours() % 12 || 12));
  const [wakeMinute, setWakeMinute] = useState(String(now.getMinutes()).padStart(2, '0'));
  const [wakeAmPm, setWakeAmPm] = useState<'AM' | 'PM'>(now.getHours() >= 12 ? 'PM' : 'AM');

  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const bh = parseInt(bedHour, 10);
    const bm = parseInt(bedMinute, 10);
    const wh = parseInt(wakeHour, 10);
    const wm = parseInt(wakeMinute, 10);
    if (!bh || bh < 1 || bh > 12 || isNaN(bm) || bm < 0 || bm > 59 || !wh || wh < 1 || wh > 12 || isNaN(wm) || wm < 0 || wm > 59) {
      setError('Enter a valid time for both fields.');
      return;
    }

    const wake = new Date(now);
    wake.setHours(to24Hour(wh, wakeAmPm), wm, 0, 0);

    const bedtime = new Date(wake);
    bedtime.setHours(to24Hour(bh, bedAmPm), bm, 0, 0);
    if (bedtime >= wake) bedtime.setDate(bedtime.getDate() - 1); // bedtime is the night before

    setSubmitting(true);
    setError(null);
    await onSave(bedtime, wake, quality);
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Pressable
          className="bg-background border-t border-border rounded-t-3xl px-4 pt-3 pb-8 gap-4"
          onPress={() => {}}
        >
          <View className="w-10 h-1 bg-border rounded-full self-center" />
          <Text className="text-white text-lg font-bold text-center">Log Sleep</Text>

          <TimeField
            label="Bedtime"
            hour={bedHour}
            minute={bedMinute}
            amPm={bedAmPm}
            onHour={setBedHour}
            onMinute={setBedMinute}
            onAmPm={setBedAmPm}
          />
          <TimeField
            label="Wake"
            hour={wakeHour}
            minute={wakeMinute}
            amPm={wakeAmPm}
            onHour={setWakeHour}
            onMinute={setWakeMinute}
            onAmPm={setWakeAmPm}
          />

          <View className="gap-2">
            <Text className="text-gray-400 text-sm">Quality</Text>
            <View className="flex-row gap-2">
              {QUALITIES.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => setQuality(q)}
                  className={`flex-1 h-12 rounded-xl items-center justify-center border ${
                    quality === q ? 'bg-primary border-primary' : 'bg-surface border-border'
                  }`}
                >
                  <Text className={`font-bold ${quality === q ? 'text-black' : 'text-white'}`}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {error && <Text className="text-xs text-red-400 text-center">{error}</Text>}

          <Button fullWidth size="lg" onPress={() => void handleSave()} loading={submitting}>
            Save
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
