import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useDistricts } from '@/api/catalog';
import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { currentLanguage } from '@/i18n';
import { useLocation } from '@/location/store';
import { buildYandexMapHtml, parseMapMessage, type MapCenter } from '@/map/yandexHtml';
import { useDraft } from '@/requests/draft';
import { colors, fontSize, spacing } from '@/theme';

const API_KEY = process.env.EXPO_PUBLIC_YANDEX_MAPS_KEY ?? '';
/** Whole Uzbekistan, when we know nothing better. */
const UZBEKISTAN: MapCenter = { lat: 41.3, lng: 64.5, zoom: 6 };

/** Full-screen Yandex map: tap or drag the pin to mark the exact place. */
export default function MapPickerScreen() {
  const { t } = useTranslation();
  const draft = useDraft();
  const { regionId, districtId } = useLocation();
  const districts = useDistricts(regionId);
  const [picked, setPicked] = useState<{ lat: number; lng: number; address: string | null } | null>(
    draft.coords ? { ...draft.coords, address: null } : null,
  );
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  // Start at the chosen district; if it has no coordinates, at a city of the same region.
  const center: MapCenter | null = useMemo(() => {
    if (!districts.data) return regionId ? null : UZBEKISTAN;
    const district = districts.data.find((d) => d.id === districtId);
    if (district?.lat != null && district.lng != null) {
      return { lat: district.lat, lng: district.lng, zoom: 14 };
    }
    const anyCity = districts.data.find((d) => d.lat != null && d.lng != null);
    return anyCity?.lat != null && anyCity.lng != null
      ? { lat: anyCity.lat, lng: anyCity.lng, zoom: 10 }
      : UZBEKISTAN;
  }, [districts.data, districtId, regionId]);

  // Built once per center, so the map doesn't reload while the user taps around.
  const html = useMemo(
    () =>
      center
        ? buildYandexMapHtml({
            apiKey: API_KEY,
            language: currentLanguage(),
            center,
            pin: draft.coords,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft.coords only as the initial pin
    [center],
  );

  function confirm() {
    if (!picked) return;
    draft.update({
      coords: { lat: picked.lat, lng: picked.lng },
      // Fill the address field only if the customer hasn't typed one.
      ...(picked.address && !draft.address.trim() ? { address: picked.address } : {}),
    });
    router.back();
  }

  if (!API_KEY) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.footer}>
          <Notice tone="error" text={t('map.noKey')} />
          <BigButton label={t('common.back')} variant="outline" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.title} accessibilityRole="header">
        {t('map.title')}
      </Text>
      <View style={styles.map}>
        {html ? (
          <WebView
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://localhost' }}
            onMessage={(event) => {
              const message = parseMapMessage(event.nativeEvent.data);
              if (message?.type === 'ready') setState('ready');
              if (message?.type === 'error') setState('error');
              if (message?.type === 'pick') setPicked(message);
            }}
            onError={() => setState('error')}
            geolocationEnabled
            javaScriptEnabled
          />
        ) : null}
        {state === 'loading' ? (
          <View style={styles.overlay} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.hint}>{t('common.loading')}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.footer}>
        {state === 'error' ? <Notice tone="error" text={t('map.failed')} /> : null}
        <Text style={styles.hint}>
          {picked ? (picked.address ?? t('map.pointChosen')) : t('map.tapHint')}
        </Text>
        <BigButton label={t('map.confirm')} disabled={!picked} onPress={confirm} />
        <BigButton label={t('common.back')} variant="outline" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
    color: colors.text,
    padding: spacing.md,
  },
  map: { flex: 1, backgroundColor: colors.surface },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  footer: { padding: spacing.md, gap: spacing.sm },
  hint: { fontSize: fontSize.small, color: colors.textMuted, textAlign: 'center' },
});
