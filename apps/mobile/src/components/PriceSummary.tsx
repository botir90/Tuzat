import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '@/theme';
import { AppText } from './AppText';

export interface PriceRowData {
  label: string;
  value: string;
  /** The total row: bold and larger. */
  strong?: boolean;
  /** Discounts and commission (shown as a minus). */
  negative?: boolean;
}

/** Label left, amount right, last row bold (design: PriceRow / PriceSummary). */
export function PriceSummary({ rows }: { rows: PriceRowData[] }) {
  return (
    <View>
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={[styles.row, index > 0 && styles.divider, row.strong && styles.strongRow]}
        >
          <AppText
            variant={row.strong ? 'bodyStrong' : 'body'}
            color={row.strong ? 'text' : 'textSecondary'}
            style={styles.label}
          >
            {row.label}
          </AppText>
          <AppText
            variant={row.strong ? 'h3' : 'label'}
            color={row.negative ? 'primary' : 'text'}
            style={row.strong ? styles.extrabold : null}
          >
            {row.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  strongRow: { paddingTop: 12 },
  label: { flex: 1 },
  extrabold: { fontFamily: fonts.extrabold },
});
