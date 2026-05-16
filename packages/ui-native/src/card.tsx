import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from './cn';

export type CardVariant = 'flat' | 'elevated' | 'tinted';

export interface CardProps extends Omit<ViewProps, 'style'> {
  variant?: CardVariant;
  tint?: 'mint' | 'teal' | 'sunshine' | 'peach' | 'lavender' | 'warm';
  className?: string;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}

const variantClasses: Record<CardVariant, string> = {
  flat: 'bg-surface border border-line-light',
  elevated: 'bg-surface shadow-sm',
  tinted: '',
};

const tintClasses: Record<NonNullable<CardProps['tint']>, string> = {
  mint: 'bg-promo-mint-50',
  teal: 'bg-promo-teal-50',
  sunshine: 'bg-promo-sunshine-50',
  peach: 'bg-promo-peach-50',
  lavender: 'bg-promo-lavender-50',
  warm: 'bg-surface-warm',
};

export const Card = forwardRef<View, CardProps>(function Card(
  { variant = 'flat', tint, className, children, style, ...rest },
  ref,
) {
  return (
    <View
      ref={ref}
      style={style}
      className={cn(
        'rounded-2xl p-4',
        variantClasses[variant],
        tint && tintClasses[tint],
        className,
      )}
      {...rest}
    >
      {children}
    </View>
  );
});
