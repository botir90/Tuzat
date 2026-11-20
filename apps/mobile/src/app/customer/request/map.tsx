import * as Location from 'expo-location';
import { router } from 'expo-router';
import { ChevronLeft, LocateFixed, MapPin, Search } from 'lucide-react-native';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useDistricts } from '@/api/catalog';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/buttons';
import { Notice } from '@/components/Notice';
import { TextField } from '@/components/TextField';
import { currentLanguage } from '@/i18n';
import { useLocation } from '@/location/store';
import {
  buildYandexMapHtml,
  parseMapMessage,
  searchScript,
  setCenterScript,
  type MapCenter,
} from '@/map/yandexHtml';
import { useDraft } from '@/requests/draft';
import { colors, fonts, radius, spacing } from '@/theme';

const API_KEY = process.env.EXPO_PUBLIC_YANDEX_MAPS_KEY ?? '';
/** Whole Uzbekistan, when we know nothing better. */
const UZBEKISTAN: MapCenter = { lat: 41.3, lng: 64.5, zoom: 6 };

type MapState = 'loading' | 'ready' | 'error';

/**
 * Address picker (design/screens/AddressMap.html): move the map under the center pin;
 * the bottom sheet shows the address and asks for landmark, apartment and floor.
 * If the map can't load, the address can still be typed by hand.
 */
export default function AddressMapScreen() {
  const { t } = useTranslation();
  const draft = useDraft();
  const { regionId, districtId } = useLocation();
  const districts = useDistricts(regionId);
  const webView = useRef<ComponentRef<typeof WebView>>(null);

  const [mapState, setMapState] = useState<MapState>(API_KEY ? 'loading' : 'error');
  const [coords, setCoords] = useState(draft.coords);
  const [address, setAddress] = useState(draft.address);
  const [landmark, setLandmark] = useState(draft.landmark);
  const [apartment, setApartment] = useState(draft.apartment);
  const [floor, setFloor] = useState(draft.floor);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [addressError, setAddressError] = useState(false);

  // Start at the saved point, else the chosen district, else a city of the region.
  const center: MapCenter | null = useMemo(() => {
    if (draft.coords) return { ...draft.coords, zoom: 17 };
    if (!districts.data) return regionId ? null : UZBEKISTAN;
    const district = districts.data.find((d) => d.id === districtId);
    if (district?.lat != null && district.lng != null) {
      return { lat: district.lat, lng: district.lng, zoom: 14 };
    }
    const anyCity = districts.data.find((d) => d.lat != null && d.lng != null);
    return anyCity?.lat != null && anyCity.lng != null
      ? { lat: anyCity.lat, lng: anyCity.lng, zoom: 12 }
      : UZBEKISTAN;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft.coords only as the start
  }, [districts.data, districtId, regionId]);

  // Built once per center, so the map doesn't reload while the user moves it.
  const html = useMemo(
    () =>
      center && API_KEY
        ? buildYandexMapHtml({ apiKey: API_KEY, language: currentLanguage(), center })
        : null,
    [center],
  );

  async function goToMyLocation() {
    setLocating(true);
    setNotice(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setNotice(t('request.locationDenied'));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      setCoords({ lat: latitude, lng: longitude });
      webView.current?.injectJavaScript(setCenterScript(latitude, longitude));
    } catch {
      setNotice(t('request.locationFailed'));
    } finally {
      setLocating(false);
    }
  }

  function search() {
    if (query.trim().length < 2) return;
    setNotice(null);
    webView.current?.injectJavaScript(searchScript(query.trim()));
  }

  function confirm() {
    if (address.trim().length < 3) {
      setAddressError(true);
      return;
    }
    draft.update({
      address: address.trim(),
      landmark: landmark.trim(),
      apartment: apartment.trim(),
      floor: floor.trim(),
      coords,
    });
    router.back();
  }

  return (
    <View style={styles.root}>
      {/* Map (or a calm background when it can't load) */}
      <View style={styles.map}>
        {html ? (
          <WebView
            ref={webView}
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://localhost' }}
            onMessage={(event) => {
              const message = parseMapMessage(event.nativeEvent.data);
              if (message?.type === 'ready') setMapState('ready');
              if (message?.type === 'error') setMapState('error');
              if (message?.type === 'notFound') setNotice(t('map.notFound'));
              if (message?.type === 'center') {
                setCoords({ lat: message.lat, lng: message.lng });
                if (message.address) setAddress(message.address);
              }
            }}
            onError={() => setMapState('error')}
            javaScriptEnabled
          />
        ) : null}
        {mapState === 'loading' ? (
          <View style={styles.mapOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}

        {/* Center pin: the master comes to this point */}
        {mapState === 'ready' ? (
          <View style={styles.pinWrap} pointerEvents="none">
            <View style={styles.pinLabel}>
              <AppText variant="caption" color="onPrimary" style={styles.bold}>
                {t('map.pinLabel')}
              </AppText>
            </View>
            <MapPin size={44} color={colors.primary} fill={colors.surface} strokeWidth={2.2} />
            <View style={styles.pinShadow} />
          </View>
        ) : null}

        {mapState === 'ready' ? (
          <Pressable
            onPress={() => void goToMyLocation()}
            accessibilityRole="button"
            accessibilityLabel={t('map.myLocation')}
            style={styles.locate}
          >
            {locating ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <LocateFixed size={24} color={colors.primary} strokeWidth={2} />
            )}
          </Pressable>
        ) : null}
      </View>

      {/* Back + search */}
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={styles.round}
          >
            <ChevronLeft size={24} color={colors.text} strokeWidth={2.2} />
          </Pressable>
          {mapState === 'ready' ? (
            <View style={styles.searchBox}>
              <Search size={20} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={search}
                returnKeyType="search"
                placeholder={t('map.searchPlaceholder')}
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={t('map.searchPlaceholder')}
                style={styles.searchInput}
              />
            </View>
          ) : null}
        </View>
      </SafeAreaView>

      {/* Bottom sheet */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.handle} />
            {mapState === 'error' ? <Notice tone="warning" text={t('map.failed')} /> : null}
            {notice ? <Notice tone="warning" text={notice} /> : null}
            <TextField
              label={t('map.selectedAddress')}
              value={address}
              onChangeText={(value) => {
                setAddress(value);
                setAddressError(false);
              }}
              placeholder={t('request.addressPlaceholder')}
              error={addressError ? t('request.addressRequired') : null}
            />
            <TextField
              label={t('map.landmark')}
              value={landmark}
              onChangeText={setLandmark}
              placeholder={t('request.landmarkPlaceholder')}
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField
                  label={t('map.apartment')}
                  value={apartment}
                  onChangeText={setApartment}
                  placeholder="5"
                  maxLength={10}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label={t('map.floor')}
                  value={floor}
                  onChangeText={setFloor}
                  placeholder="3"
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>
            <PrimaryButton label={t('map.confirm')} onPress={confirm} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E9ECE4' },
  map: { flex: 1 },
  mapOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  pinWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    alignItems: 'center',
    // The tip of the pin, not its middle, marks the point.
    transform: [{ translateY: -78 }],
  },
  pinLabel: {
    backgroundColor: colors.text,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  pinShadow: {
    width: 14,
    height: 6,
    borderRadius: 7,
    backgroundColor: 'rgba(21,32,30,0.25)',
    marginTop: -4,
  },
  bold: { fontFamily: fonts.bold },
  locate: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  topBar: { position: 'absolute', left: 0, right: 0, top: 0 },
  topRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  searchBox: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: fonts.regular, color: colors.text },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    maxHeight: 460,
    elevation: 8,
  },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: 14,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
