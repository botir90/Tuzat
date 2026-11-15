import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { MAX_PHOTOS_PER_REQUEST } from '@usta/shared';
import { compressPhoto } from '@/media/compress';
import type { DraftPhoto } from '@/requests/draft';
import { colors, spacing } from '@/theme';
import { BigButton } from './BigButton';
import { Notice } from './Notice';

interface PhotoPickerProps {
  photos: DraftPhoto[];
  onChange: (photos: DraftPhoto[]) => void;
}

/** Up to 5 photos from the camera or the gallery, compressed on the phone. */
export function PhotoPicker({ photos, onChange }: PhotoPickerProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const left = MAX_PHOTOS_PER_REQUEST - photos.length;

  async function add(source: 'camera' | 'gallery') {
    setError(null);
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t(source === 'camera' ? 'photos.cameraDenied' : 'photos.galleryDenied'));
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: source === 'gallery',
      selectionLimit: left,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;

    setBusy(true);
    try {
      const compressed = await Promise.all(
        result.assets.slice(0, left).map(async (asset) => ({
          uri: await compressPhoto(asset.uri, asset.width, asset.height),
        })),
      );
      onChange([...photos, ...compressed]);
    } catch {
      setError(t('photos.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      {photos.length > 0 ? (
        <View style={styles.grid}>
          {photos.map((photo, index) => (
            <View key={photo.uri} style={styles.thumbWrap}>
              <Image
                source={{ uri: photo.uri }}
                style={styles.thumb}
                accessibilityIgnoresInvertColors
              />
              <Pressable
                onPress={() => onChange(photos.filter((_, i) => i !== index))}
                accessibilityRole="button"
                accessibilityLabel={t('photos.remove', { number: index + 1 })}
                style={styles.remove}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.onPrimary} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {left > 0 ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <BigButton
              label={t('photos.camera')}
              variant="outline"
              loading={busy}
              onPress={() => void add('camera')}
            />
          </View>
          <View style={styles.flex}>
            <BigButton
              label={t('photos.gallery')}
              variant="outline"
              disabled={busy}
              onPress={() => void add('gallery')}
            />
          </View>
        </View>
      ) : (
        <Notice text={t('photos.limit', { max: MAX_PHOTOS_PER_REQUEST })} />
      )}
      {error ? <Notice tone="error" text={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { width: 96, height: 96 },
  thumb: { width: 96, height: 96, borderRadius: 8, backgroundColor: colors.surface },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
