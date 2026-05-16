import { Text, View } from 'react-native';
import { cn } from './cn';

export interface PriceProps {
  /** Final price the customer pays. */
  amount: number;
  /** Optional MRP/strikethrough price. Hidden if equal to or below `amount`. */
  compareAt?: number | null;
  /** Optional pre-computed discount percentage. Auto-derived if absent. */
  discountPct?: number | null;
  /** ISO 4217 currency code; only `INR` is special-cased to ₹. */
  currency?: 'INR' | 'USD';
  /** `lg` for product detail, `md` for cards, `sm` for cart lines. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Show "% OFF" pill when there's a discount. */
  showDiscount?: boolean;
}

const symbolFor = (currency: PriceProps['currency'] = 'INR') =>
  currency === 'USD' ? '$' : '\u20B9';

const sizeMap: Record<NonNullable<PriceProps['size']>, {
  amount: string;
  compare: string;
  discount: string;
}> = {
  sm: {
    amount: 'text-sm font-semibold',
    compare: 'text-xs',
    discount: 'text-[10px] font-semibold',
  },
  md: {
    amount: 'text-base font-bold',
    compare: 'text-xs',
    discount: 'text-xs font-semibold',
  },
  lg: {
    amount: 'text-2xl font-bold',
    compare: 'text-sm',
    discount: 'text-sm font-semibold',
  },
};

export function formatRupees(amount: number, currency: PriceProps['currency'] = 'INR') {
  if (Number.isNaN(amount)) return `${symbolFor(currency)}0`;
  const rounded = Math.round(amount);
  return `${symbolFor(currency)}${rounded.toLocaleString('en-IN')}`;
}

export function Price({
  amount,
  compareAt,
  discountPct,
  currency = 'INR',
  size = 'md',
  className,
  showDiscount = true,
}: PriceProps) {
  const styles = sizeMap[size];
  const showCompare =
    typeof compareAt === 'number' && compareAt > 0 && compareAt > amount;
  const pct =
    discountPct ??
    (showCompare ? Math.round(((compareAt! - amount) / compareAt!) * 100) : null);

  return (
    <View className={cn('flex-row items-baseline gap-2', className)}>
      <Text className={cn('text-ink', styles.amount)}>
        {formatRupees(amount, currency)}
      </Text>
      {showCompare && (
        <Text className={cn('text-ink-muted line-through', styles.compare)}>
          {formatRupees(compareAt!, currency)}
        </Text>
      )}
      {showDiscount && pct && pct > 0 ? (
        <Text className={cn('text-primary-600', styles.discount)}>{pct}% off</Text>
      ) : null}
    </View>
  );
}
