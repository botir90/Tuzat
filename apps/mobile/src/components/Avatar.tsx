import { BadgeCheck } from 'lucide-react-native';
import { Image, StyleSheet, View } from 'react-native';
import { colors, fonts } from '@/theme';
import { AppText } from './AppText';

/** Placeholder colors (from the mockups) when there is no photo. */
const AVATAR_COLORS = ['#3D6E8F', '#8A5A1E', '#5E4A8C', '#0F6B5C', '#A3305E'];

export function avatarColor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? colors.primary;
}

interface AvatarProps {
  id: string;
  name: string | null;
  photoUrl: string | null;
  size?: number;
  verified?: boolean;
}

/** Round photo, or the first letter on a calm color; optional verified mark. */
export function Avatar({ id, name, photoUrl, size = 52, verified }: AvatarProps) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  const mark = Math.max(18, Math.round(size * 0.34));
  return (
    <View style={round} importantForAccessibility="no-hide-descendants">
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={[round, styles.photo]} />
      ) : (
        <View style={[round, styles.initial, { backgroundColor: avatarColor(id) }]}>
          <AppText color="onPrimary" style={{ fontFamily: fonts.extrabold, fontSize: size * 0.38 }}>
            {(name ?? '?').charAt(0).toUpperCase()}
          </AppText>
        </View>
      )}
      {verified ? (
        <View style={[styles.mark, { width: mark, height: mark, borderRadius: mark / 2 }]}>
          <BadgeCheck size={mark - 4} color={colors.primary} strokeWidth={2.2} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { backgroundColor: colors.primaryMuted },
  initial: { alignItems: 'center', justifyContent: 'center' },
  mark: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
