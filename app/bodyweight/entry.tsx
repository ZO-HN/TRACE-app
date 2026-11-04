import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { randomUUID } from 'expo-crypto';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useUnitPreference } from '../../src/hooks/useUnitPreference';
import { useAsyncAction } from '../../src/hooks/useAsyncAction';
import { localDate } from '../../src/lib/localDate';
import { validateWeighInDate, weighInWeightKg } from '../../src/lib/bodyweight/entryInput';
import { supabase } from '../../src/lib/supabase';
import Button from '../../src/components/ui/Button';
import ScreenHeader from '../../src/components/ui/ScreenHeader';

export default function WeighInEntryScreen() {
  const { profile } = useTraceUserContext();
  const { unit, isLoaded } = useUnitPreference();
  const action = useAsyncAction();
  const [date, setDate] = useState(localDate());
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [replaceDate, setReplaceDate] = useState<string | null>(null);
  const save = () => action.run(async () => {
    if (!profile) throw new Error('Sign in before saving a weigh-in.');
    const recorded_date = validateWeighInDate(date.trim());
    const weight_kg = weighInWeightKg(weight, unit);
    const cleanNote = note.trim();
    if (cleanNote.length > 280) throw new Error('Keep weigh-in notes to 280 characters.');
    const existing = await supabase.from('bodyweight_logs').select('id')
      .eq('user_id', profile.id).eq('recorded_date', recorded_date).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data && replaceDate !== recorded_date) {
      setReplaceDate(recorded_date);
      return;
    }
    const { error } = await supabase.from('bodyweight_logs').upsert({
      id: existing.data?.id ?? randomUUID(), user_id: profile.id, recorded_date, weight_kg, note: cleanNote || null,
    }, { onConflict: 'user_id,recorded_date' });
    if (error) throw error;
    router.replace('/bodyweight/history');
  });
  return <SafeAreaView className="flex-1 bg-background" edges={['top']}>
    <ScreenHeader title="Add weigh-in" />
    <ScrollView contentContainerClassName="p-4 gap-5 pb-12" keyboardShouldPersistTaps="handled">
      <View className="gap-2">
        <Text className="text-white font-semibold">Date</Text>
        <TextInput accessibilityLabel="Weigh-in date" value={date} onChangeText={(value) => { setDate(value); setReplaceDate(null); }}
          placeholder="YYYY-MM-DD" placeholderTextColor="#6B7280" maxLength={10}
          editable={!action.pending} autoCapitalize="none" autoCorrect={false}
          className="bg-surface border border-border rounded-xl p-3 text-white min-h-[48px]" />
      </View>
      <View className="gap-2">
        <Text className="text-white font-semibold">Weight ({unit})</Text>
        <TextInput accessibilityLabel={`Weigh-in weight in ${unit}`} value={weight} onChangeText={(value) => { setWeight(value); setReplaceDate(null); }}
          keyboardType="decimal-pad" editable={!action.pending && isLoaded} maxLength={12}
          className="bg-surface border border-border rounded-xl p-3 text-white min-h-[48px]" />
      </View>
      <View className="gap-2">
        <Text className="text-white font-semibold">Note (optional)</Text>
        <TextInput accessibilityLabel="Weigh-in note" value={note} onChangeText={(value) => { setNote(value); setReplaceDate(null); }}
          multiline maxLength={280} editable={!action.pending}
          className="bg-surface border border-border rounded-xl p-3 text-white min-h-[80px]" />
      </View>
      {action.error && <Text accessibilityRole="alert" className="text-red-400">{action.error}</Text>}
      {replaceDate && <Text accessibilityRole="alert" className="text-yellow-400">A weigh-in already exists for {replaceDate}.</Text>}
      <Button onPress={() => void save()} loading={action.pending} disabled={!isLoaded}
        icon={<Ionicons name="save-outline" size={18} color="white" />}>{replaceDate ? 'Replace existing weigh-in' : 'Save weigh-in'}</Button>
    </ScrollView>
  </SafeAreaView>;
}
