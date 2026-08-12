import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AnimatePresence, MotiView } from 'moti';
import { useOutboxStore } from '../lib/outbox/outboxStore';
import { isValidSetInput, toSetLogInsert } from '../lib/outbox/mapSetLog';
import { predictNextSet, suggestNextSet } from '../lib/workout/suggestNextSet';
import { lbsToKg, kgToLbs } from '../lib/units';
import { useExerciseCatalog } from '../hooks/useExerciseCatalog';
import { lookupExerciseId } from '../lib/workout/catalog';
import { createSessionDraft, sessionInsertFrom } from '../lib/workout/session';
import { useAssignedWorkout } from '../hooks/useAssignedWorkout';
import { useLastSetsForExercises } from '../hooks/useLastSetsForExercises';
import { useSetCalibration } from '../hooks/useSetCalibration';
import { useMediaUpload } from '../hooks/useMediaUpload';
import type { RNFile } from '../lib/storage/uploadMedia';
import MediaViewer from './media/MediaViewer';
import Badge from './ui/Badge';
import Card from './ui/Card';
import FadeInView from './ui/FadeInView';

type SetData = {
  id: string;
  weight: string;
  reps: string;
  rpe: string;
  completed: boolean;
  isWarmup?: boolean;
  isFailure?: boolean;
};

type Exercise = {
  id: string;
  name: string;
  sets: SetData[];
  /** Isometric hold (plank, wall-sit) — reps column becomes seconds. */
  isIsometric?: boolean;
};

const calculateE1RM = (weightStr: string, repsStr: string): string => {
  const weight = parseFloat(weightStr);
  const reps = parseInt(repsStr, 10);
  if (isNaN(weight) || isNaN(reps) || reps < 1 || weight < 0) return '-';
  const e1RM = weight * (1 + reps / 30.0);
  return Math.round(e1RM).toString();
};

// Fallback content shown until a coach-assigned template loads (or if none
// is assigned yet) — same shape as the real thing so nothing special-cases it.
const initialWorkout: Exercise[] = [
  {
    id: 'e1',
    name: 'Barbell Back Squat',
    sets: [
      { id: 's1-1', weight: '135', reps: '10', rpe: '7', completed: false },
      { id: 's1-2', weight: '225', reps: '8', rpe: '8', completed: false },
    ],
  },
  {
    id: 'e2',
    name: 'Romanian Deadlift',
    sets: [
      { id: 's2-1', weight: '185', reps: '10', rpe: '7', completed: false },
      { id: 's2-2', weight: '205', reps: '8', rpe: '8', completed: false },
    ],
  },
];

const REST_SECONDS_DEFAULT = 90;

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function GymLogger({
  userId,
  footer,
  overrideTemplateId,
}: {
  userId: string;
  /** Rendered after the exercise list, inside the same scroll container. */
  footer?: ReactNode;
  /** Load this specific template (e.g. tapped from "My Workouts") instead
   * of the usual assigned/most-recent-PRIVATE auto-resolution. */
  overrideTemplateId?: string | null;
}) {
  const [exercises, setExercises] = useState<Exercise[]>(initialWorkout);

  // Real workout content (coach-assigned template, or overrideTemplateId
  // when the trainee explicitly picked one). Falls back to the built-in
  // placeholder when nothing loads (offline / not yet assigned).
  const { templateId, templateName, exercises: templateExercises } = useAssignedWorkout(
    userId,
    overrideTemplateId,
  );

  // Offline outbox: completed sets are queued locally (SQLite) and flushed
  // to Supabase by useOutboxSync (mounted higher up) when connectivity returns.
  const enqueueSetLog = useOutboxStore((s) => s.enqueueSetLog);
  const ensureSessionQueued = useOutboxStore((s) => s.ensureSessionQueued);
  const pendingCount = useOutboxStore(
    (s) => s.items.filter((i) => i.status !== 'synced').length,
  );

  // Client-first session: created with a client UUID so offline set_logs can
  // reference it; the parent row flushes before its sets.
  const sessionRef = useRef(
    createSessionDraft(userId, 'Current Workout', Date.now(), randomUUID()),
  );

  // Real exercise ids from the DB catalog (matched by name). Until the
  // catalog loads (e.g. offline cold start), fall back to placeholder ids —
  // those items retry and only succeed once real ids exist.
  const { byName: catalogByName } = useExerciseCatalog();
  const placeholderIds = useMemo(
    () => Object.fromEntries(initialWorkout.map((e) => [e.id, randomUUID()])) as Record<
      string,
      string
    >,
    [],
  );

  // Form-check clips: uploaded to R2 pre-completion; the object key rides
  // along on the queued set log (set_logs.form_video_s3_key).
  const media = useMediaUpload();
  const [videoKeys, setVideoKeys] = useState<Record<string, string>>({});
  const [uploadingSetId, setUploadingSetId] = useState<string | null>(null);
  const [viewingSetId, setViewingSetId] = useState<string | null>(null);

  const attachClip = async (setId: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 60,
      quality: 0.6,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    let size = asset.fileSize ?? 0;
    if (!size) {
      const info = await FileSystem.getInfoAsync(asset.uri);
      size = info.exists ? (info.size ?? 0) : 0;
    }
    const file: RNFile = {
      uri: asset.uri,
      name: asset.fileName ?? `clip-${Date.now()}.mp4`,
      type: asset.mimeType ?? 'video/mp4',
      size,
    };

    setUploadingSetId(setId);
    try {
      const { key } = await media.upload(file, 'form-video');
      setVideoKeys((prev) => ({ ...prev, [setId]: key }));
    } catch {
      // media.error carries the message; surfaced below the form-clip button
    } finally {
      setUploadingSetId(null);
    }
  };

  // Rest timer state
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Adopt template content once it loads — but never clobber logged work.
  useEffect(() => {
    if (!templateExercises) return;
    setExercises((current) => {
      const hasLoggedWork = current.some((e) => e.sets.some((s) => s.completed));
      return hasLoggedWork ? current : (templateExercises as Exercise[]);
    });
    if (templateName) {
      sessionRef.current = { ...sessionRef.current, sessionName: templateName };
    }
  }, [templateExercises, templateName]);

  const startRestTimer = (seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestSecondsRemaining(seconds);
    setRestTimerActive(true);

    timerRef.current = setInterval(() => {
      setRestSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setRestTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelRestTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestTimerActive(false);
    setRestSecondsRemaining(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const updateSet = (
    eIndex: number,
    sIndex: number,
    field: keyof SetData,
    value: string | boolean,
  ) => {
    const updated = exercises.map((e) => ({ ...e, sets: [...e.sets] }));
    const targetSet = { ...updated[eIndex].sets[sIndex], [field]: value };
    updated[eIndex].sets[sIndex] = targetSet;

    if (field === 'completed' && value === true) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      startRestTimer(REST_SECONDS_DEFAULT);

      const exercise = updated[eIndex];
      const input = {
        id: randomUUID(),
        sessionId: sessionRef.current.id,
        exerciseId:
          lookupExerciseId(catalogByName, exercise.name) ??
          placeholderIds[exercise.id] ??
          exercise.id,
        setNumber: sIndex + 1,
        weightLbs: targetSet.weight,
        reps: exercise.isIsometric ? '' : targetSet.reps,
        rpe: targetSet.rpe,
        formVideoKey: videoKeys[targetSet.id] ?? null,
        isWarmup: targetSet.isWarmup,
        isFailure: targetSet.isFailure,
        setType: exercise.isIsometric ? ('duration' as const) : ('reps' as const),
        durationSeconds: exercise.isIsometric ? targetSet.reps : null,
      };
      if (isValidSetInput(input)) {
        void ensureSessionQueued(
          sessionInsertFrom(sessionRef.current, Date.now(), templateId),
        );
        void enqueueSetLog(toSetLogInsert(input));
      }
    }

    setExercises(updated);
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-6 gap-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-white">
              {templateName ?? 'Current Workout'}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {exercises.length} exercise{exercises.length === 1 ? '' : 's'}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            {pendingCount > 0 && (
              <Badge tone="primary" pulse>
                {pendingCount} queued
              </Badge>
            )}
            <Pressable onPress={() => router.push('/(tabs)/training')}>
              <Ionicons name="folder-outline" size={20} color="#9CA3AF" />
            </Pressable>
          </View>
        </View>

        {exercises.map((exercise, eIndex) => (
          <FadeInView key={exercise.id} delay={eIndex * 60}>
            <Card className="overflow-hidden">
              <View className="bg-border/30 px-4 py-3 border-b border-border flex-row items-center justify-between gap-2">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="barbell-outline" size={16} color="#4ADE80" />
                  <Text className="text-lg font-semibold text-white">{exercise.name}</Text>
                </View>
                <Pressable
                  onPress={() =>
                    setExercises((current) =>
                      current.map((e, i) => (i === eIndex ? { ...e, isIsometric: !e.isIsometric } : e)),
                    )
                  }
                  className={`px-2 py-1 rounded-full border ${
                    exercise.isIsometric ? 'bg-primary/15 border-primary/40' : 'border-border'
                  }`}
                >
                  <Text
                    className={`text-[11px] font-medium ${
                      exercise.isIsometric ? 'text-primary' : 'text-gray-500'
                    }`}
                  >
                    {exercise.isIsometric ? 'Hold (sec)' : 'Reps'}
                  </Text>
                </Pressable>
              </View>

              <View className="p-2 gap-2">
                <View className="flex-row px-2">
                  <Text className="w-8 text-xs font-semibold text-gray-500 uppercase">Set</Text>
                  <Text className="flex-1 text-xs font-semibold text-gray-500 uppercase text-center">
                    lbs
                  </Text>
                  <Text className="flex-1 text-xs font-semibold text-gray-500 uppercase text-center">
                    {exercise.isIsometric ? 'Sec' : 'Reps'}
                  </Text>
                  <Text className="w-14 text-xs font-semibold text-gray-500 uppercase text-center">
                    Done
                  </Text>
                </View>

                {exercise.sets.map((set, sIndex) => {
                  const e1RM = calculateE1RM(set.weight, set.reps);
                  // Auto-regulated hint: only for the first not-yet-completed
                  // set right after a completed one in this same exercise —
                  // an RPE-based lookback within this session, see
                  // suggestNextSet.ts. No AI call, no persisted history read.
                  const prevSet = sIndex > 0 ? exercise.sets[sIndex - 1] : null;
                  const showSuggestion =
                    !set.completed && !exercise.isIsometric && prevSet?.completed;
                  const suggestion = showSuggestion
                    ? suggestNextSet({
                        weight_kg: lbsToKg(parseFloat(prevSet!.weight) || 0),
                        reps: parseInt(prevSet!.reps, 10) || 0,
                        rpe: prevSet!.rpe ? parseInt(prevSet!.rpe, 10) : null,
                      })
                    : null;
                  return (
                    <View
                      key={set.id}
                      className={`gap-2 p-2 rounded-xl ${set.completed ? 'bg-green-900/10' : ''}`}
                    >
                      {suggestion && suggestion.reason !== 'no_history' && (
                        <Text className="text-[11px] text-blue-400 pl-10">
                          Suggested: {kgToLbs(suggestion.suggested_weight_kg)} lbs (
                          {suggestion.reason === 'increase'
                            ? 'last set felt easy'
                            : suggestion.reason === 'decrease'
                              ? 'last set was maximal'
                              : 'hold steady'}
                          )
                        </Text>
                      )}
                      <View className="flex-row items-center gap-2">
                        <Text className="w-8 text-gray-400 font-medium text-sm text-center">
                          {sIndex + 1}
                        </Text>
                        <TextInput
                          value={set.weight}
                          onChangeText={(v) => updateSet(eIndex, sIndex, 'weight', v)}
                          editable={!set.completed}
                          keyboardType="decimal-pad"
                          className="flex-1 h-12 bg-background border border-border rounded-xl text-center text-white font-medium"
                        />
                        <TextInput
                          value={set.reps}
                          onChangeText={(v) => updateSet(eIndex, sIndex, 'reps', v)}
                          editable={!set.completed}
                          keyboardType="number-pad"
                          className="flex-1 h-12 bg-background border border-border rounded-xl text-center text-white font-medium"
                        />
                        <Pressable
                          onPress={() => updateSet(eIndex, sIndex, 'completed', !set.completed)}
                        >
                          <MotiView
                            key={set.completed ? 'done' : 'undone'}
                            from={{ scale: set.completed ? 0.7 : 1 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 10, stiffness: 300 }}
                            className={`w-14 h-12 rounded-xl items-center justify-center ${
                              set.completed
                                ? 'bg-green-500'
                                : 'bg-surface border-2 border-border'
                            }`}
                          >
                            {set.completed && <Ionicons name="checkmark" size={22} color="#fff" />}
                          </MotiView>
                        </Pressable>
                      </View>

                      {/* RPE chip row — a horizontal picker beats a native <select> for a
                          gym-floor, one-thumb interaction. */}
                      <View className="flex-row gap-1.5 pl-10">
                        {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
                          <Pressable
                            key={n}
                            disabled={set.completed}
                            onPress={() => updateSet(eIndex, sIndex, 'rpe', n)}
                            className={`w-7 h-7 rounded-md items-center justify-center ${
                              set.rpe === n ? 'bg-primary' : 'bg-background border border-border'
                            }`}
                          >
                            <Text
                              className={`text-xs font-medium ${
                                set.rpe === n ? 'text-white' : 'text-gray-400'
                              }`}
                            >
                              {n}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      {/* Warm-up / failure tags — Tracked-parity Tier A. Toggleable
                          before the set is marked done; queued on completion via
                          isWarmup/isFailure on the outbox payload. */}
                      <View className="flex-row gap-1.5 pl-10">
                        <Pressable
                          disabled={set.completed}
                          onPress={() => updateSet(eIndex, sIndex, 'isWarmup', !set.isWarmup)}
                          className={`px-2 py-1 rounded-full border ${
                            set.isWarmup ? 'bg-amber-500/15 border-amber-500/40' : 'border-border'
                          }`}
                        >
                          <Text
                            className={`text-[11px] font-medium ${
                              set.isWarmup ? 'text-amber-400' : 'text-gray-500'
                            }`}
                          >
                            Warm-up
                          </Text>
                        </Pressable>
                        <Pressable
                          disabled={set.completed}
                          onPress={() => updateSet(eIndex, sIndex, 'isFailure', !set.isFailure)}
                          className={`px-2 py-1 rounded-full border ${
                            set.isFailure ? 'bg-red-500/15 border-red-500/40' : 'border-border'
                          }`}
                        >
                          <Text
                            className={`text-[11px] font-medium ${
                              set.isFailure ? 'text-red-400' : 'text-gray-500'
                            }`}
                          >
                            To failure
                          </Text>
                        </Pressable>
                      </View>

                      <View className="flex-row items-center justify-between pl-10">
                        <View className="bg-primary/10 px-2 py-1 rounded-full">
                          <Text className="text-primary text-xs font-semibold">
                            e1RM: {e1RM} lbs
                          </Text>
                        </View>
                        {videoKeys[set.id] ? (
                          <Pressable
                            onPress={() =>
                              setViewingSetId((cur) => (cur === set.id ? null : set.id))
                            }
                            className="flex-row items-center gap-1 bg-green-500/15 px-2 py-1 rounded-full"
                          >
                            <Ionicons name="videocam-outline" size={12} color="#4ADE80" />
                            <Text className="text-green-400 text-xs font-medium">
                              {viewingSetId === set.id ? 'Hide clip' : 'View clip'}
                            </Text>
                          </Pressable>
                        ) : (
                          !set.completed && (
                            <Pressable
                              onPress={() => void attachClip(set.id)}
                              disabled={uploadingSetId === set.id}
                              className="flex-row items-center gap-1 bg-border/40 px-2 py-1 rounded-full"
                            >
                              <Ionicons name="camera-outline" size={12} color="#9CA3AF" />
                              <Text className="text-gray-400 text-xs font-medium">
                                {uploadingSetId === set.id ? 'Uploading…' : 'Form clip'}
                              </Text>
                            </Pressable>
                          )
                        )}
                      </View>

                      {viewingSetId === set.id && videoKeys[set.id] && (
                        <View className="pl-10">
                          <MediaViewer objectKey={videoKeys[set.id]} />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </Card>
          </FadeInView>
        ))}

        {media.error && (
          <Text className="text-xs text-red-400 text-center">{media.error}</Text>
        )}

        {footer}
      </ScrollView>

      <AnimatePresence>
        {restTimerActive && (
          <MotiView
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 30 }}
            transition={{ type: 'timing', duration: 220 }}
            className="absolute bottom-4 left-4 right-4"
          >
            <View
              className="bg-surface border border-primary/30 rounded-2xl p-4 flex-row items-center justify-between"
              style={{
                shadowColor: '#4ADE80',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-full bg-primary/15 items-center justify-center">
                  <Ionicons name="hourglass-outline" size={18} color="#4ADE80" />
                </View>
                <View>
                  <Text className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Resting
                  </Text>
                  <Text className="text-2xl font-bold text-white tracking-widest">
                    {formatTime(restSecondsRemaining)}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setRestSecondsRemaining((p) => p + 30)}
                  className="w-10 h-10 bg-background border border-border rounded-xl items-center justify-center"
                >
                  <Text className="text-white text-xs font-medium">+30</Text>
                </Pressable>
                <Pressable
                  onPress={cancelRestTimer}
                  className="w-10 h-10 bg-background border border-border rounded-xl items-center justify-center"
                >
                  <Ionicons name="close" size={16} color="#F87171" />
                </Pressable>
              </View>
            </View>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}
