import { InfoBanner, type BannerVariant } from './InfoBanner';

interface NoticeProps {
  text: string;
  tone?: 'info' | 'error' | 'warning' | 'safe' | 'promo';
  title?: string;
}

const TONE_TO_VARIANT: Record<NonNullable<NoticeProps['tone']>, BannerVariant> = {
  info: 'info',
  error: 'error',
  warning: 'urgent',
  safe: 'safe',
  promo: 'promo',
};

/** A short message on a soft colored background (errors, hints, statuses). */
export function Notice({ text, tone = 'info', title }: NoticeProps) {
  return <InfoBanner variant={TONE_TO_VARIANT[tone]} title={title} text={text} />;
}
