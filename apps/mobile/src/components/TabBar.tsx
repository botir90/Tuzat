import { router, type Href } from 'expo-router';
import { ClipboardList, House, User, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, sizes } from '@/theme';
import { AppText } from './AppText';

export type CustomerTab = 'home' | 'orders' | 'profile';

const TABS: {
  id: CustomerTab;
  labelKey: 'tabs.home' | 'tabs.orders' | 'tabs.profile';
  href: Href;
  Icon: LucideIcon;
}[] = [
  { id: 'home', labelKey: 'tabs.home', href: '/customer', Icon: House },
  { id: 'orders', labelKey: 'tabs.orders', href: '/customer/requests', Icon: ClipboardList },
  { id: 'profile', labelKey: 'tabs.profile', href: '/settings', Icon: User },
];

/**
 * Bottom tab bar of the customer screens (design: TabBar, height 76, active = teal).
 * The "Bonuses" tab from Home.html arrives with the bonus system (M6.9).
 */
export function TabBar({ active }: { active: CustomerTab }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.bar, { paddingBottom: insets.bottom, height: sizes.tabBar + insets.bottom }]}
    >
      {TABS.map(({ id, labelKey, href, Icon }) => {
        const selected = id === active;
        const color = selected ? colors.primary : colors.textMuted;
        return (
          <Pressable
            key={id}
            onPress={() => (selected ? undefined : router.replace(href))}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={t(labelKey)}
            style={styles.tab}
          >
            <Icon size={24} color={color} strokeWidth={2} />
            <AppText variant="tiny" style={{ color }}>
              {t(labelKey)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
});
