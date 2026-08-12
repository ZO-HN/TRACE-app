// Tap-to-record, tap-to-stop mic button that transcribes via the user's
// configured AI copilot endpoint (src/lib/ai/client.ts's transcribeAudio) —
// the STT half of Tracked-parity voice logging. Routes to AI Copilot setup
// first if no key is configured yet, same pattern as the photo-scan button.

import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { useAICopilotConfig } from '../../hooks/useAICopilotConfig';
import { transcribeAudio } from '../../lib/ai/client';

export default function VoiceInputButton({
  onTranscribed,
  onError,
}: {
  onTranscribed: (text: string) => void;
  onError: (message: string) => void;
}) {
  const { config, isConfigured } = useAICopilotConfig();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const start = async () => {
    if (!isConfigured || !config) {
      router.push('/ai-copilot/settings');
      return;
    }
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) return;

    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
  };

  const stop = async () => {
    setRecording(false);
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri || !config) return;

    setTranscribing(true);
    try {
      const result = await transcribeAudio(config, uri, 'audio/m4a');
      if (result.ok) onTranscribed(result.text);
      else onError(result.error);
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <Pressable
      onPress={() => void (recording ? stop() : start())}
      disabled={transcribing}
      className={`w-11 h-11 rounded-full items-center justify-center border ${
        recording ? 'bg-red-500/20 border-red-500/50' : 'bg-background border-border'
      }`}
    >
      {transcribing ? (
        <Text className="text-[9px] text-gray-400">...</Text>
      ) : (
        <Ionicons name={recording ? 'stop' : 'mic-outline'} size={18} color={recording ? '#F87171' : '#E5E7EB'} />
      )}
    </Pressable>
  );
}
