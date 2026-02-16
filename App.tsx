import React, { useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio, AVPlaybackStatusSuccess } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

type Track = {
  id: string;
  title: string;
  subtitle: string;
  fileName: string;
  url: string;
  sourcePage: string;
};

const TRACKS: Track[] = [
  {
    id: '1',
    title: 'Baby Boo #1 (Voicemod)',
    subtitle: 'She gon call me baby boo',
    fileName: 'baby-boo-1.mp3',
    url: 'https://us-tuna-sounds-files.voicemod.net/4c112d89-cdb0-49c9-a69e-7f3b70f7fb3a-1767342163307.mp3',
    sourcePage: 'https://tuna.voicemod.net/sound/4c112d89-cdb0-49c9-a69e-7f3b70f7fb3a',
  },
  {
    id: '2',
    title: 'Baby Boo #2 (Voicemod)',
    subtitle: 'Variant listing',
    fileName: 'baby-boo-2.mp3',
    url: 'https://us-tuna-sounds-files.voicemod.net/931cffda-7412-4c00-a138-d73f37028c04-1762694376177.mp3',
    sourcePage: 'https://tuna.voicemod.net/sound/931cffda-7412-4c00-a138-d73f37028c04',
  },
  {
    id: '3',
    title: 'Baby Boo #3 (Voicemod)',
    subtitle: 'Variant listing',
    fileName: 'baby-boo-3.mp3',
    url: 'https://us-tuna-sounds-files.voicemod.net/77fbe776-496c-4f6a-ad10-297defdea77a-1763988848132.mp3',
    sourcePage: 'https://tuna.voicemod.net/sound/77fbe776-496c-4f6a-ad10-297defdea77a',
  },
  {
    id: '4',
    title: 'Baby Boo #4 (Voicemod)',
    subtitle: 'Short clip',
    fileName: 'baby-boo-4.mp3',
    url: 'https://us-tuna-sounds-files.voicemod.net/ec78bcd1-2fc9-4a68-b549-5438c6dac7fa-1746996535009.mp3',
    sourcePage: 'https://tuna.voicemod.net/sound/ec78bcd1-2fc9-4a68-b549-5438c6dac7fa',
  },
  {
    id: '5',
    title: 'Baby Boo #5 (Voicemod)',
    subtitle: 'Longer variant',
    fileName: 'baby-boo-5.mp3',
    url: 'https://us-tuna-sounds-files.voicemod.net/76f0f831-6caa-4e2f-909a-8345c8dd91b4-1739321508030.mp3',
    sourcePage: 'https://tuna.voicemod.net/sound/76f0f831-6caa-4e2f-909a-8345c8dd91b4',
  },
  {
    id: '6',
    title: 'Baby Boo #6 (Voicemod)',
    subtitle: 'Remix-ish variant',
    fileName: 'baby-boo-6.mp3',
    url: 'https://us-tuna-sounds-files.voicemod.net/c4c34c4e-151b-4fd3-8c02-c1dc8ca3e64a-1697079066655.mp3',
    sourcePage: 'https://tuna.voicemod.net/sound/c4c34c4e-151b-4fd3-8c02-c1dc8ca3e64a',
  },
  {
    id: '7',
    title: 'Baby Boo #7 (Voicemod)',
    subtitle: 'Quick one-liner',
    fileName: 'baby-boo-7.mp3',
    url: 'https://us-tuna-sounds-files.voicemod.net/57078a4c-7667-46c1-848b-a1cdbeeb11a3-1769462838388.mp3',
    sourcePage: 'https://tuna.voicemod.net/sound/57078a4c-7667-46c1-848b-a1cdbeeb11a3',
  },
];

export default function App() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const headerHint = useMemo(() => {
    if (Platform.OS === 'ios') {
      return 'Tap Download, save to Files, then set as ringtone via iOS flow (GarageBand/Finder).';
    }
    return 'Tap Download, then set ringtone in Android Sound settings.';
  }, []);

  const stopCurrent = async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
    } catch {
      // ignored
    }

    soundRef.current = null;
    setPlayingId(null);
  };

  const playTrack = async (track: Track) => {
    try {
      await Haptics.selectionAsync();
      if (playingId === track.id) {
        await stopCurrent();
        return;
      }

      await stopCurrent();

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setPlayingId(track.id);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        const loadedStatus = status as AVPlaybackStatusSuccess;
        if (loadedStatus.didJustFinish) {
          stopCurrent();
        }
      });
    } catch {
      Alert.alert('Playback failed', 'Could not stream this clip right now.');
    }
  };

  const exportTrack = async (track: Track) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDownloadingId(track.id);

      const destination = `${FileSystem.documentDirectory}${track.fileName}`;

      const existing = await FileSystem.getInfoAsync(destination);
      if (existing.exists) {
        await FileSystem.deleteAsync(destination, { idempotent: true });
      }

      const downloaded = await FileSystem.downloadAsync(track.url, destination);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(downloaded.uri, {
          mimeType: 'audio/mpeg',
          dialogTitle: `Export ${track.title}`,
          UTI: 'public.mp3',
        });
      }

      Alert.alert(
        'Exported',
        canShare
          ? 'Clip exported. Save it where you want and set as ringtone in phone settings.'
          : `Saved locally at: ${downloaded.uri}`
      );
    } catch {
      Alert.alert('Export failed', 'Could not download this clip.');
    } finally {
      setDownloadingId(null);
    }
  };

  const openSource = async (track: Track) => {
    try {
      await Linking.openURL(track.sourcePage);
    } catch {
      Alert.alert('Could not open source link');
    }
  };

  const renderItem = ({ item }: { item: Track }) => {
    const isPlaying = playingId === item.id;
    const isExporting = downloadingId === item.id;

    return (
      <View style={styles.tile}>
        <Text style={styles.tileTitle}>{item.title}</Text>
        <Text style={styles.tileSub}>{item.subtitle}</Text>

        <View style={styles.row}>
          <TouchableOpacity
            onPress={() => playTrack(item)}
            style={[styles.btn, isPlaying ? styles.btnStop : styles.btnPlay]}
          >
            <Text style={styles.btnText}>{isPlaying ? 'Stop' : 'Play'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => exportTrack(item)}
            style={[styles.btn, styles.btnExport]}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Download</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openSource(item)} style={[styles.btn, styles.btnSrc]}>
            <Text style={styles.btnText}>Source</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.header}>Baby Boo Collection</Text>
      <Text style={styles.hint}>{headerHint}</Text>

      <FlatList
        data={TRACKS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090f',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  header: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  hint: {
    color: '#9ca3af',
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 18,
  },
  list: {
    paddingBottom: 24,
  },
  tile: {
    backgroundColor: '#141422',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#22223a',
  },
  tileTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  tileSub: {
    color: '#94a3b8',
    marginTop: 3,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
  },
  btnPlay: {
    flex: 1,
    backgroundColor: '#2563eb',
  },
  btnStop: {
    flex: 1,
    backgroundColor: '#dc2626',
  },
  btnExport: {
    flex: 1,
    backgroundColor: '#059669',
  },
  btnSrc: {
    backgroundColor: '#6b7280',
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
});
