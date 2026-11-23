import { router, type Href } from 'expo-router';
import {
  BriefcaseBusiness,
  ClipboardList,
  Gift,
  House,
  Inbox,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, sizes } from '@/theme';
import { AppText } from './AppText';

type LabelKey =
  | 'tabs.home'
  | 'tabs.orders'
  | 'tabs.bonus'
  | 'tabs.profile'
  | 'tabs.feed'
  | 'tabs.myJobs'
  | 'tabs.earnings';

interface Tab<Id extends string> {
  id: Id;
  labelKey: LabelKey;
  href: Href;
  Icon: LucideIcon;
}

export type CustomerTab = 'home' | 'orders' | 'bonus' | 'profile';
export type MasterTab = 'feed' | 'jobs' | 'earnings';
export type TabId = CustomerTab | MasterTab;

/** Customer (Home.html): Home, Orders, Bonuses, My home. */
const CUSTOMER_TABS: Tab<CustomerTab>[] = [
  { id: 'home', labelKey: 'tabs.home', href: '/customer', Icon: House },
  { id: 'orders', labelKey: 'tabs.orders', href: '/customer/requests', Icon: ClipboardList },
  { id: 'bonus', labelKey: 'tabs.bonus', href: '/customer/bonus', Icon: Gift },
  { id: 'profile', labelKey: 'tabs.profile', href: '/settings', Icon: User },
];

/** Master (MasterFeed.html): Orders, My jobs, Earnings. Settings open from Earnings. */
const MASTER_TABS: Tab<MasterTab>[] = [
  { id: 'feed', labelKey: 'tabs.feed', href: '/master', Icon: Inbox },
  { id: 'jobs', labelKey: 'tabs.myJobs', href: '/jobs', Icon: BriefcaseBusiness },
  { id: 'earnings', labelKey: 'tabs.earnings', href: '/master/earnings', Icon: Wallet },
];

const isMasterTab = (id: TabId): id is MasterTab => MASTER_TABS.some((tab) => tab.id === id);

/** Bottom tab bar (design: TabBar, height 76, active = teal). Picks the set from the tab id. */
export function TabBar({ active }: { active: TabId }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabs: Tab<TabId>[] = isMasterTab(active) ? MASTER_TABS : CUSTOMER_TABS;
  return (
    <View
      style={[styles.bar, { paddingBottom: insets.bottom, height: sizes.tabBar + insets.bottom }]}
    >
      {tabs.map(({ id, labelKey, href, Icon }) => {
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
