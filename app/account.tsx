import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTraceUserContext } from '../src/context/TraceUserContext';
import { useAsyncAction } from '../src/hooks/useAsyncAction';
import { profileUpdate, type EditableProfile } from '../src/lib/account/profileInput';
import { supabase } from '../src/lib/supabase';
import Button from '../src/components/ui/Button';
import ScreenHeader from '../src/components/ui/ScreenHeader';

export default function AccountScreen() {
  const { profile, refetchProfile } = useTraceUserContext();
  const action = useAsyncAction();
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<EditableProfile>({
    first_name: profile?.first_name ?? '', last_name: profile?.last_name ?? '',
    experience_level: profile?.experience_level ?? 'BEGINNER',
    primary_goal: profile?.primary_goal ?? '', injury_notes: profile?.injury_notes ?? '',
  });
  const edit = (patch: Partial<EditableProfile>) => { setDraft((value) => ({ ...value, ...patch })); setSaved(false); };
  const save = () => action.run(async () => {
    if (!profile) throw new Error('Sign in before saving account details.');
    const { data, error } = await supabase.from('profiles').update(profileUpdate(draft))
      .eq('id', profile.id).select('id').single();
    if (error) throw error;
    if (!data) throw new Error('Your account was not updated. Please retry.');
    await refetchProfile();
    setSaved(true);
  });
  return <SafeAreaView className="flex-1 bg-background" edges={['top']}>
    <ScreenHeader title="Account" />
    <ScrollView contentContainerClassName="p-4 gap-5 pb-12" keyboardShouldPersistTaps="handled">
      <Text className="text-gray-400">{profile?.email}</Text>
      {(['first_name', 'last_name', 'primary_goal', 'injury_notes'] as const).map((field) => (
        <View key={field} className="gap-2">
          <Text className="text-white font-semibold">{{ first_name: 'First name', last_name: 'Last name', primary_goal: 'Primary goal', injury_notes: 'Injury notes' }[field]}</Text>
          <TextInput accessibilityLabel={field.replaceAll('_', ' ')} value={draft[field] ?? ''}
            onChangeText={(value) => edit({ [field]: value })} editable={!action.pending}
            multiline={field === 'injury_notes' || field === 'primary_goal'}
            maxLength={field === 'injury_notes' ? 2000 : field === 'primary_goal' ? 500 : 80}
            className="bg-surface border border-border rounded-xl p-3 text-white min-h-[48px]" />
        </View>
      ))}
      <View className="gap-2">
        <Text className="text-white font-semibold">Experience</Text>
        <View className="flex-row flex-wrap gap-2">
          {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((level) => <Pressable key={level}
            accessibilityRole="radio" accessibilityState={{ checked: draft.experience_level === level }}
            disabled={action.pending} onPress={() => edit({ experience_level: level })}
            className={`px-3 py-3 rounded-xl border ${draft.experience_level === level ? 'border-primary bg-primary/15' : 'border-border'}`}>
            <Text className="text-white">{level[0] + level.slice(1).toLowerCase()}</Text>
          </Pressable>)}
        </View>
      </View>
      {action.error && <Text accessibilityRole="alert" className="text-red-400">{action.error}</Text>}
      {saved && <Text className="text-primary">Account updated</Text>}
      <Button onPress={() => void save()} loading={action.pending} icon={<Ionicons name="save-outline" size={18} color="white" />}>Save account</Button>
      <Button variant="secondary" onPress={() => router.push('/bodyweight/settings')}>Measurement settings</Button>
    </ScrollView>
  </SafeAreaView>;
}
