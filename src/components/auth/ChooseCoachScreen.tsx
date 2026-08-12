import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCoachSelection, type AvailableCoach } from '../../hooks/useCoachSelection';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';

// Blocks the whole app (mounted by app/_layout.tsx's Gate, not a route) until
// the trainee's profiles.coach_id is set. Signups no longer auto-enroll under
// a default coach — every new trainee lands here first.
export default function ChooseCoachScreen({ onLinked }: { onLinked: () => void }) {
  const { coaches, isLoading, listError, isSubmitting, submitError, claimById, claimByCode } = useCoachSelection();
  const [tab, setTab] = useState<'browse' | 'code'>('browse');
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');

  const filtered = coaches.filter((c) =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const handlePick = async (coach: AvailableCoach) => {
    const ok = await claimById(coach.id);
    if (ok) onLinked();
  };

  const handleCodeSubmit = async () => {
    if (!code.trim()) return;
    const ok = await claimByCode(code);
    if (ok) onLinked();
  };

  return (
    <SafeAreaView className="flex-1 bg-background px-5">
      <View className="mt-4 mb-2">
        <Text className="text-2xl font-bold text-white">Choose your coach</Text>
        <Text className="text-sm text-gray-400 mt-1">
          You need a coach before you can use TRACE. Browse the list below, or enter a code if your coach gave you
          one.
        </Text>
      </View>

      <View className="flex-row gap-1 rounded-xl bg-surface p-1 mt-4 mb-3">
        <Pressable
          onPress={() => setTab('browse')}
          className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2 ${tab === 'browse' ? 'bg-background' : ''}`}
        >
          <Ionicons name="people-outline" size={15} color={tab === 'browse' ? '#4ADE80' : '#6B7280'} />
          <Text className={`text-sm font-medium ${tab === 'browse' ? 'text-white' : 'text-gray-500'}`}>Browse</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('code')}
          className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2 ${tab === 'code' ? 'bg-background' : ''}`}
        >
          <Ionicons name="key-outline" size={15} color={tab === 'code' ? '#4ADE80' : '#6B7280'} />
          <Text className={`text-sm font-medium ${tab === 'code' ? 'text-white' : 'text-gray-500'}`}>Have a code</Text>
        </Pressable>
      </View>

      {submitError && <Text className="text-xs text-red-400 mb-2">{submitError}</Text>}

      {tab === 'browse' ? (
        <>
          <View className="flex-row items-center bg-surface border border-border rounded-xl px-3 mb-3">
            <Ionicons name="search-outline" size={16} color="#6B7280" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search coaches..."
              placeholderTextColor="#6B7280"
              className="flex-1 h-11 px-2.5 text-white"
            />
          </View>

          {isLoading ? (
            <Text className="text-sm text-gray-400 text-center mt-6">Loading coaches...</Text>
          ) : listError ? (
            <Text className="text-sm text-red-400 text-center mt-6">{listError}</Text>
          ) : filtered.length === 0 ? (
            <Text className="text-sm text-gray-400 text-center mt-6">No coaches found.</Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => void handlePick(item)}
                  disabled={isSubmitting}
                  className="flex-row items-center justify-between bg-surface border border-border rounded-xl px-4 py-3 mb-2"
                >
                  <Text className="text-base text-white font-medium">
                    {item.first_name} {item.last_name}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                </Pressable>
              )}
            />
          )}
        </>
      ) : (
        <View>
          <View className="flex-row items-center bg-surface border border-border rounded-xl px-3 mb-3">
            <Ionicons name="key-outline" size={16} color="#6B7280" />
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder="e.g. 4F7QX2"
              placeholderTextColor="#6B7280"
              autoCapitalize="characters"
              className="flex-1 h-12 px-2.5 text-white tracking-widest"
            />
          </View>
          <Button onPress={() => void handleCodeSubmit()} loading={isSubmitting} disabled={!code.trim()} fullWidth>
            Link to coach
          </Button>
        </View>
      )}

      <Pressable onPress={() => void supabase.auth.signOut()} className="mt-4 self-center">
        <Text className="text-sm text-gray-500">Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}
