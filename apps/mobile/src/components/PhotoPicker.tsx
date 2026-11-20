import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { MAX_PHOTOS_PER_REQUEST } from '@usta/shared';
import { compressPhoto } from '@/media/compress';
import type { DraftPhoto } from '@/requests/draft';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { Notice } from './Notice';

const TILE = 72;

interface PhotoPickerProps {
  photos: DraftPhoto[];
  onChange: (photos: DraftPhoto[]) => void;
  /** Maximum number of photos (default: 5, the request limit). */
  max?: number;
  /** Shown after the "add photo" tile in the same row (e.g. the voice button). */
  trailing?: ReactNode;
}

/**
 * Thumbnails + dashed "add photo" tile (design: PhotoPicker). Photos come from the camera
 * or the gallery and are compressed on the phone before upload.
 */
export function PhotoPicker({
  photos,
  onChange,
  max = MAX_PHOTOS_PER_REQUEST,
  trailing,
}: PhotoPickerProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const left = max - photos.length;

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

  function chooseSource() {
    // A native dialog with two big choices; works on every Android phone.
    Alert.alert(t('photos.addTitle'), undefined, [
      { text: t('photos.camera'), onPress: () => void add('camera') },
      { text: t('photos.gallery'), onPress: () => void add('gallery') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {photos.map((photo, index) => (
          <View key={photo.uri} style={styles.tile}>
            <Image
              source={{ uri: photo.uri }}
              style={styles.thumb}
              accessibilityLabel={t('photos.number', { number: index + 1 })}
            />
            <Pressable
              onPress={() => onChange(photos.filter((_, i) => i !== index))}
              accessibilityRole="button"
              accessibilityLabel={t('photos.remove', { number: index + 1 })}
              style={styles.remove}
              hitSlop={10}
            >
              <X size={16} color={colors.onPrimary} strokeWidth={2.6} />
            </Pressable>
          </View>
        ))}
        {left > 0 ? (
          <Pressable
            onPress={chooseSource}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('photos.add')}
            style={({ pressed }) => [styles.tile, styles.add, pressed && styles.pressed]}
          >
            {busy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Camera size={24} color={colors.textSecondary} strokeWidth={2} />
                <AppText variant="tiny" color="textSecondary">
                  {t('photos.short')}
                </AppText>
              </>
            )}
          </Pressable>
        ) : null}
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {left === 0 ? <Notice text={t('photos.limit', { max })} /> : null}
      {error ? <Notice tone="error" text={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: TILE, height: TILE },
  thumb: {
    width: TILE,
    height: TILE,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(21,32,30,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.placeholderBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pressed: { backgroundColor: colors.primarySoft },
  trailing: { flexGrow: 1, minWidth: 150 },
});
