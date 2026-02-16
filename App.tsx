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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio, AVPlaybackStatusSuccess } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';
import { GENERATED_TRACKS, GeneratedTrack } from './src/tracks.generated';

export default function App() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const headerHint = useMemo(() => {
    if (Platform.OS === 'ios') {
      return 'Drop your files in assets/audio, then export clips and set ringtone via iOS flow.';
    }
    return 'Drop your files in assets/audio, then export clips and set ringtone in Android settings.';
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

  const playTrack = async (track: GeneratedTrack) => {
    try {
      await Haptics.selectionAsync();
      if (playingId === track.id) {
        await stopCurrent();
        return;
      }

      await stopCurrent();

      const { sound } = await Audio.Sound.createAsync(track.source, {
        shouldPlay: true,
      });

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
      Alert.alert('Playback failed', 'Could not play this clip right now.');
    }
  };

  const exportTrack = async (track: GeneratedTrack) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDownloadingId(track.id);

      const asset = Asset.fromModule(track.source);
      await asset.downloadAsync();

      const sourceUri = asset.localUri ?? asset.uri;
      if (!sourceUri) throw new Error('Missing source URI');

      const destination = `${FileSystem.documentDirectory}${track.fileName}`;

      const existing = await FileSystem.getInfoAsync(destination);
      if (existing.exists) {
        await FileSystem.deleteAsync(destination, { idempotent: true });
      }

      await FileSystem.copyAsync({
        from: sourceUri,
        to: destination,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(destination, {
          mimeType: 'audio/mpeg',
          dialogTitle: `Export ${track.title}`,
          UTI: 'public.audio',
        });
      }

      Alert.alert(
        'Exported',
        canShare
          ? 'Clip exported. Save it where you want and set as ringtone in phone settings.'
          : `Saved locally at: ${destination}`
      );
    } catch {
      Alert.alert('Export failed', 'Could not export this clip.');
    } finally {
      setDownloadingId(null);
    }
  };

  const renderItem = ({ item }: { item: GeneratedTrack }) => {
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
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.header}>Baby Boo Ringtone Gallery</Text>
      <Text style={styles.hint}>{headerHint}</Text>

      {GENERATED_TRACKS.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No audio files found.</Text>
          <Text style={styles.emptySub}>Add .mp3/.m4a/.wav/.ogg files to assets/audio then run:</Text>
          <Text style={styles.emptyCode}>npm run build-tracks</Text>
        </View>
      ) : (
        <FlatList
          data={GENERATED_TRACKS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
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
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  emptyCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#141422',
    borderWidth: 1,
    borderColor: '#22223a',
  },
  emptyTitle: {
    color: '#fff',
    fontWeight: '800',
    marginBottom: 6,
    fontSize: 16,
  },
  emptySub: {
    color: '#94a3b8',
    marginBottom: 8,
  },
  emptyCode: {
    color: '#7dd3fc',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});
