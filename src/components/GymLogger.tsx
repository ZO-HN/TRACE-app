import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AnimatePresence, MotiView } from 'moti';
import { forUser } from '../lib/outbox/ownership';
import { useOutboxStore } from '../lib/outbox/outboxStore';
import { isValidSetInput, toSetLogInsert } from '../lib/outbox/mapSetLog';
import { predictNextSet, suggestNextSet } from '../lib/workout/suggestNextSet';
import { lbsToKg, kgToLbs } from '../lib/units';
import { createSessionDraft, sessionInsertFrom } from '../lib/workout/session';
import { extendRestDeadline, restSecondsRemaining as getRestSecondsRemaining } from '../lib/workout/restTimer';
import { activeWorkoutKey, parseActiveWorkout, recoverQueuedSets, WorkoutRecoveryError, type ActiveWorkoutDraft } from '../lib/workout/activeDraft';
import { readActiveDraft, writeActiveDraft } from '../lib/workout/activeDraftStorage';
import { getAllOutboxItems } from '../lib/outbox/db';
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
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Real workout content (coach-assigned template, or overrideTemplateId
  // when the trainee explicitly picked one). Only real downloaded content is loggable.
  const { templateId, templateName, exercises: templateExercises, status, error: workoutError, retry } = useAssignedWorkout(
    userId,
    overrideTemplateId,
  );

  // Offline outbox: completed sets are queued locally (SQLite) and flushed
  // to Supabase by useOutboxSync (mounted higher up) when connectivity returns.
  const enqueueSetLog = useOutboxStore((s) => s.enqueueSetLog);
  const ensureSessionQueued = useOutboxStore((s) => s.ensureSessionQueued);
  const pendingCount = useOutboxStore(
    (s) => forUser(s.items, userId).filter((i) => i.status !== 'synced').length,
  );

  // Client-first session: created with a client UUID so offline set_logs can
  // reference it; the parent row flushes before its sets.
  const sessionRef = useRef(
    createSessionDraft(userId, 'Current Workout', Date.now(), randomUUID()),
  );

  const resolveExerciseId = (exercise: Exercise) => exercise.id;
  const exerciseIds = useMemo(() => exercises.map((e) => e.id), [exercises]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saving = useRef(false);
  const logIds = useRef(new Map<string, string>());
  const loadedTemplate = useRef<string | null>(null);
  const [draftReadyKey, setDraftReadyKey] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const lastSets = useLastSetsForExercises(userId, exerciseIds);
  const calibration = useSetCalibration();

  // Form-check clips: uploaded to R2 pre-completion; the object key rides
  // along on the queued set log (set_logs.form_video_s3_key).
  const media = useMediaUpload();
  const [videoKeys, setVideoKeys] = useState<Record<string, string>>({});
  const [uploadingSetId, setUploadingSetId] = useState<string | null>(null);
  const [viewingSetId, setViewingSetId] = useState<string | null>(null);
  const clipActive = useRef(false);

  const attachClip = async (setId: string) => {
    if (clipActive.current) return;
    clipActive.current = true;
    setUploadingSetId(setId);
    try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setSaveError('Camera access is disabled. Enable it in your phone settings to record a form clip.');
      return;
    }

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

      const { key } = await media.upload(file, 'form-video');
      setVideoKeys((prev) => ({ ...prev, [setId]: key }));
      setSaveError(null);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Could not record or upload your form clip. Please retry.');
    } finally {
      clipActive.current = false;
      setUploadingSetId(null);
    }
  };

  // Rest timer state
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restDeadline = useRef<number | null>(null);

  const refreshRestTimer = () => {
    const remaining = getRestSecondsRemaining(restDeadline.current, Date.now());
    setRestSecondsRemaining(remaining);
    if (restDeadline.current !== null && remaining === 0) {
      restDeadline.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
      setRestTimerActive(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  };

  // Adopt template content once it loads — but never clobber logged work.
  useEffect(() => {
    if (!templateExercises || !templateId) return;
    if (loadedTemplate.current === templateId && sessionRef.current.userId === userId) return;
    let cancelled = false;
    loadedTemplate.current = null;
    setSaveError(null);
    setDraftReadyKey(null);
    setExercises([]);
    const key = activeWorkoutKey(userId, templateId);
    void (async () => {
      let restored: ActiveWorkoutDraft | null = null;
      try {
        restored = parseActiveWorkout(await readActiveDraft(key), userId, templateId);
        if (restored) restored = recoverQueuedSets(restored, await getAllOutboxItems());
      } catch (cause) {
        if (!cancelled) setSaveError(cause instanceof WorkoutRecoveryError ? cause.message : 'Could not restore your workout. Retry loading before logging more sets.');
        return;
      }
      if (cancelled) return;
      loadedTemplate.current = templateId;
      sessionRef.current = restored?.session ?? createSessionDraft(userId, templateName ?? 'Workout', Date.now(), randomUUID());
      logIds.current = new Map(restored?.logIds ?? []);
      setExercises(restored?.exercises ?? templateExercises as Exercise[]);
      setVideoKeys(restored?.videoKeys ?? {});
      setDraftReadyKey(key);
    })();
    return () => { cancelled = true; };
  }, [templateExercises, templateName, templateId, userId]);

  useEffect(() => {
    if (!templateId || draftReadyKey !== activeWorkoutKey(userId, templateId)
      || sessionRef.current.userId !== userId) return;
    const draft: ActiveWorkoutDraft = { version: 1, templateId, session: sessionRef.current,
      exercises, logIds: [...logIds.current], videoKeys };
    let cancelled = false;
    void writeActiveDraft(draftReadyKey, JSON.stringify(draft)).catch(() => {
      if (!cancelled) setSaveError('Could not save the workout draft. Completed sets remain in the log queue.');
    });
    return () => { cancelled = true; };
  }, [exercises, videoKeys, draftReadyKey, userId, templateId]);

  const finishWorkout = async () => {
    if (saving.current || !templateId || !draftReadyKey || !exercises.some((e) => e.sets.some((s) => s.completed))) return;
    saving.current = true;
    setFinishing(true);
    try {
      await ensureSessionQueued(sessionInsertFrom(sessionRef.current, Date.now(), templateId));
      await writeActiveDraft(draftReadyKey, null);
      cancelRestTimer();
      sessionRef.current = createSessionDraft(userId, templateName ?? 'Workout', Date.now(), randomUUID());
      logIds.current.clear();
      setVideoKeys({});
      setExercises(templateExercises as Exercise[]);
      setSaveError(null);
      router.push('/history');
    } catch { setSaveError('Could not finish the workout. Your saved sets are still available; please retry.'); }
    finally { saving.current = false; setFinishing(false); }
  };

  const startRestTimer = (seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    restDeadline.current = Date.now() + seconds * 1000;
    setRestSecondsRemaining(seconds);
    setRestTimerActive(true);

    timerRef.current = setInterval(refreshRestTimer, 250);
  };

  const cancelRestTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    restDeadline.current = null;
    setRestTimerActive(false);
    setRestSecondsRemaining(0);
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshRestTimer();
    });
    return () => {
      subscription.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const updateSet = async (
    eIndex: number,
    sIndex: number,
    field: keyof SetData,
    value: string | boolean,
  ) => {
    if (saving.current || !templateId || templateId !== loadedTemplate.current || (status !== 'ready' && status !== 'cached')) return;
    // A completed set is immutable in this logger; do not create another UUID
    // by toggling it off and on after it has already synced.
    if (exercises[eIndex].sets[sIndex].completed) return;
    const updated = exercises.map((e) => ({ ...e, sets: [...e.sets] }));
    const targetSet = { ...updated[eIndex].sets[sIndex], [field]: value };
    updated[eIndex].sets[sIndex] = targetSet;

    if (field === 'completed' && value === true) {

      const exercise = updated[eIndex];
      const logKey = `${eIndex}:${targetSet.id}`;
      if (!logIds.current.has(logKey)) logIds.current.set(logKey, randomUUID());
      const input = {
        id: logIds.current.get(logKey)!,
        sessionId: sessionRef.current.id,
        exerciseId: resolveExerciseId(exercise),
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
      if (!isValidSetInput(input)) { setSaveError('Enter a valid weight, reps or duration before saving.'); return; }
      saving.current = true;
      try {
        await writeActiveDraft(activeWorkoutKey(userId, templateId), JSON.stringify({
          version: 1, templateId, session: sessionRef.current, exercises,
          logIds: [...logIds.current], videoKeys,
        } satisfies ActiveWorkoutDraft));
        await ensureSessionQueued(sessionInsertFrom(sessionRef.current, Date.now(), templateId));
        await enqueueSetLog(toSetLogInsert(input), userId);
        setSaveError(null);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        startRestTimer(REST_SECONDS_DEFAULT);
      } catch {
        setSaveError('Could not save this set on your device. Please retry.');
        return;
      } finally { saving.current = false; }

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

        {status === 'loading' && <Text className="text-gray-400">Loading workout…</Text>}
        {status === 'unassigned' && <Text className="text-gray-400">No workout assigned. Ask your coach to assign one, or choose a saved workout.</Text>}
        {status === 'cached' && <Text className="text-gray-400">Offline · using your downloaded workout</Text>}
        {workoutError && <View><Text className="text-red-400">{workoutError}</Text><Pressable onPress={retry}><Text className="text-primary">Retry loading workout</Text></Pressable></View>}
        {saveError && <Text className="text-red-400">{saveError}</Text>}
        {saveError && exercises.length === 0 && <Pressable onPress={retry} className="min-h-[44px] justify-center">
          <Text className="text-primary">Retry workout</Text>
        </Pressable>}
        {(status === 'ready' || status === 'cached') && exercises.map((exercise, eIndex) => (
          <FadeInView key={exercise.id} delay={eIndex * 60}>
            <Card className="overflow-hidden">
              <View className="bg-border/30 px-4 py-3 border-b border-border flex-row items-center justify-between gap-2">
                <View className="flex-row items-center gap-2 flex-1 min-w-0">
                  <Ionicons name="barbell-outline" size={16} color="#4ADE80" />
                  <Text className="text-lg font-semibold text-white flex-1">{exercise.name}</Text>
                </View>
                <Pressable
                  disabled={exercise.sets.some((set) => set.completed)}
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
                  // Auto-regulated hint: a same-session completed set right
                  // before this one, or (for a set 1) the last time this
                  // exercise was logged in any session — see
                  // predictNextSet in suggestNextSet.ts. Fully on-device,
                  // no AI call.
                  const exerciseId = exerciseIds[eIndex];
                  const prevSet = sIndex > 0 ? exercise.sets[sIndex - 1] : null;
                  const reference = prevSet?.completed
                    ? {
                        weight_kg: lbsToKg(parseFloat(prevSet.weight) || 0),
                        reps: parseInt(prevSet.reps, 10) || 0,
                        rpe: prevSet.rpe ? parseInt(prevSet.rpe, 10) : null,
                      }
                    : sIndex === 0
                      ? (lastSets[exerciseId] ?? null)
                      : null;
                  const showSuggestion = !set.completed && !exercise.isIsometric && reference;
                  const prediction = showSuggestion
                    ? predictNextSet({
                        reference,
                        setsCompletedThisSession: exercise.sets.slice(0, sIndex).filter((s) => s.completed).length,
                        calibrationMultiplier: calibration.multiplierFor(exerciseId),
                      })
                    : null;
                  return (
                    <View
                      key={set.id}
                      className={`gap-2 p-2 rounded-xl ${set.completed ? 'bg-green-900/10' : ''}`}
                    >
                      {prediction && prediction.reason !== 'no_history' && (
                        <View className="flex-row items-center justify-between pl-10 pr-1">
                          <Text className="text-[11px] text-blue-400 flex-1">
                            Suggested: {kgToLbs(prediction.suggested_weight_kg)} lbs
                            {prediction.suggested_reps ? ` × ${prediction.suggested_reps}` : ''} (
                            {prediction.reason === 'increase'
                              ? 'last set felt easy'
                              : prediction.reason === 'decrease'
                                ? 'last set was maximal'
                                : 'hold steady'}
                            )
                          </Text>
                          <Pressable
                            hitSlop={6}
                            onPress={() => calibration.feedback(exerciseId, 'up')}
                            className="p-1"
                          >
                            <Ionicons name="thumbs-up-outline" size={13} color="#6B7280" />
                          </Pressable>
                          <Pressable
                            hitSlop={6}
                            onPress={() => calibration.feedback(exerciseId, 'down')}
                            className="p-1"
                          >
                            <Ionicons name="thumbs-down-outline" size={13} color="#6B7280" />
                          </Pressable>
                        </View>
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
                          accessibilityRole="button"
                          accessibilityLabel={`Complete set ${sIndex + 1} of ${exercise.name}`}
                          disabled={set.completed || finishing}
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
                      <View className="flex-row flex-wrap gap-1.5 pl-10">
                        {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
                          <Pressable
                            key={n}
                            disabled={set.completed}
                            onPress={() => updateSet(eIndex, sIndex, 'rpe', n)}
                            className={`w-11 h-11 rounded-md items-center justify-center ${
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

        {exercises.some((e) => e.sets.some((s) => s.completed)) && <Pressable
          accessibilityRole="button" accessibilityLabel="Finish workout"
          disabled={finishing} onPress={() => void finishWorkout()}
          className="min-h-[48px] bg-primary rounded-xl flex-row items-center justify-center gap-2 px-4">
          <Ionicons name="checkmark-circle-outline" size={20} color="white" />
          <Text className="text-white font-semibold">{finishing ? 'Finishing...' : 'Finish workout'}</Text>
        </Pressable>}

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
                  onPress={() => {
                    restDeadline.current = extendRestDeadline(restDeadline.current, Date.now(), 30);
                    refreshRestTimer();
                  }}
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
