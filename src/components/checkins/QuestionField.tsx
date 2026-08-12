// Renders one CheckInQuestion for all 11 question types the coach dashboard
// supports, and reports back an answer value keyed by question id (see
// CheckInAnswerValue in src/lib/checkins/types.ts).

import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useMediaUpload } from '../../hooks/useMediaUpload';
import type { RNFile } from '../../lib/storage/uploadMedia';
import { parseChoiceOptions, type CheckInAnswerValue, type CheckInQuestion } from '../../lib/checkins/types';

const INPUT_CLASS = 'bg-surface border border-border rounded-xl px-4 py-3 text-white';

function FieldLabel({ question }: { question: CheckInQuestion }) {
  return (
    <Text className="text-sm text-gray-400">
      {question.label}
      {question.required && <Text className="text-red-400"> *</Text>}
    </Text>
  );
}

function TextField({ question, value, onChange }: FieldProps) {
  return (
    <TextInput
      className={INPUT_CLASS}
      placeholder={question.placeholder}
      placeholderTextColor="#6B7280"
      value={typeof value === 'string' ? value : ''}
      onChangeText={(t) => onChange(t)}
      multiline
    />
  );
}

function NumberField({ question, value, onChange, keyboardType = 'decimal-pad' }: FieldProps & { keyboardType?: 'decimal-pad' | 'numeric' }) {
  return (
    <TextInput
      className={INPUT_CLASS}
      placeholder={question.placeholder ?? '0'}
      placeholderTextColor="#6B7280"
      keyboardType={keyboardType}
      value={typeof value === 'number' ? String(value) : ''}
      onChangeText={(t) => {
        const n = Number(t);
        onChange(t.trim() === '' || Number.isNaN(n) ? null : n);
      }}
    />
  );
}

function ScaleField({ question, value, onChange, max }: FieldProps & { max: number }) {
  const selected = typeof value === 'number' ? value : null;
  return (
    <View className="flex-row flex-wrap gap-2">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          className={`w-10 h-10 items-center justify-center rounded-full border ${
            selected === n ? 'bg-primary border-primary' : 'bg-surface border-border'
          }`}
        >
          <Text className={`font-semibold ${selected === n ? 'text-black' : 'text-white'}`}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function SingleChoiceField({ question, value, onChange }: FieldProps) {
  const options = parseChoiceOptions(question.placeholder);
  const selected = typeof value === 'string' ? value : null;
  return (
    <View className="gap-2">
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          className={`flex-row items-center justify-between px-4 py-3 rounded-xl border ${
            selected === opt ? 'bg-primary/15 border-primary' : 'bg-surface border-border'
          }`}
        >
          <Text className={selected === opt ? 'text-primary font-medium' : 'text-white'}>{opt}</Text>
          {selected === opt && <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />}
        </Pressable>
      ))}
    </View>
  );
}

function MultipleChoiceField({ question, value, onChange }: FieldProps) {
  const options = parseChoiceOptions(question.placeholder);
  const selected = Array.isArray(value) ? value : [];
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
  };
  return (
    <View className="gap-2">
      {options.map((opt) => {
        const isOn = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => toggle(opt)}
            className={`flex-row items-center justify-between px-4 py-3 rounded-xl border ${
              isOn ? 'bg-primary/15 border-primary' : 'bg-surface border-border'
            }`}
          >
            <Text className={isOn ? 'text-primary font-medium' : 'text-white'}>{opt}</Text>
            {isOn && <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />}
          </Pressable>
        );
      })}
    </View>
  );
}

function TimeField({ question, value, onChange }: FieldProps) {
  return (
    <TextInput
      className={INPUT_CLASS}
      placeholder={question.placeholder ?? 'HH:MM'}
      placeholderTextColor="#6B7280"
      value={typeof value === 'string' ? value : ''}
      onChangeText={onChange}
    />
  );
}

/** Shared by 'photo' and 'progress-photo' — captures an image and uploads it
 * via the generic 'file' media kind (the only R2-presign kind that accepts
 * plain image content types without a check-in-specific server change). */
function PhotoField({ value, onChange }: FieldProps) {
  const media = useMediaUpload();
  const [uri, setUri] = useState<string | null>(null);

  const pick = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const pickedUri = result.assets[0].uri;
    setUri(pickedUri);

    const info = await FileSystem.getInfoAsync(pickedUri);
    const file: RNFile = {
      uri: pickedUri,
      name: `checkin-${Date.now()}.jpg`,
      type: 'image/jpeg',
      size: info.exists ? (info.size ?? 0) : 0,
    };
    const { key } = await media.upload(file, 'file');
    onChange({ key });
  };

  const hasKey = value !== null && typeof value === 'object' && 'key' in value;

  return (
    <View className="gap-2">
      <Pressable
        onPress={() => void pick()}
        className="flex-row items-center justify-center gap-2 bg-surface border border-border rounded-xl py-3"
      >
        <Ionicons name="camera-outline" size={16} color="#E5E7EB" />
        <Text className="text-gray-200 font-medium">{uri ? 'Retake photo' : 'Take photo'}</Text>
      </Pressable>
      {media.status === 'uploading' && <Text className="text-xs text-gray-500">Uploading…</Text>}
      {media.error && <Text className="text-xs text-red-400">{media.error}</Text>}
      {hasKey && (
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
          <Text className="text-xs text-primary">Photo uploaded</Text>
        </View>
      )}
    </View>
  );
}

function MeasurementField({ question, value, onChange }: FieldProps) {
  return (
    <TextInput
      className={INPUT_CLASS}
      placeholder={question.placeholder ?? 'Enter measurement'}
      placeholderTextColor="#6B7280"
      keyboardType="decimal-pad"
      value={typeof value === 'number' ? String(value) : ''}
      onChangeText={(t) => {
        const n = Number(t);
        onChange(t.trim() === '' || Number.isNaN(n) ? null : n);
      }}
    />
  );
}

interface FieldProps {
  question: CheckInQuestion;
  value: CheckInAnswerValue;
  onChange: (value: CheckInAnswerValue) => void;
}

export default function QuestionField({ question, value, onChange }: FieldProps) {
  return (
    <View className="gap-2">
      <FieldLabel question={question} />
      {question.type === 'text' && <TextField question={question} value={value} onChange={onChange} />}
      {question.type === 'number' && <NumberField question={question} value={value} onChange={onChange} />}
      {question.type === 'bodyweight' && (
        <NumberField question={question} value={value} onChange={onChange} keyboardType="decimal-pad" />
      )}
      {question.type === 'scale-5' && <ScaleField question={question} value={value} onChange={onChange} max={5} />}
      {question.type === 'scale-10' && <ScaleField question={question} value={value} onChange={onChange} max={10} />}
      {question.type === 'single-choice' && <SingleChoiceField question={question} value={value} onChange={onChange} />}
      {question.type === 'multiple-choice' && (
        <MultipleChoiceField question={question} value={value} onChange={onChange} />
      )}
      {question.type === 'time' && <TimeField question={question} value={value} onChange={onChange} />}
      {(question.type === 'photo' || question.type === 'progress-photo') && (
        <PhotoField question={question} value={value} onChange={onChange} />
      )}
      {question.type === 'measurement' && <MeasurementField question={question} value={value} onChange={onChange} />}
    </View>
  );
}
