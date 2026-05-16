import { Text, View, type ViewProps } from 'react-native';
import { cn } from './cn';

export type PillTone =
  | 'neutral'
  | 'primary'
  | 'accent'
  | 'danger'
  | 'success'
  | 'info';

export interface PillProps extends Omit<ViewProps, 'children' | 'style'> {
  tone?: PillTone;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  textClassName?: string;
  style?: ViewProps['style'];
}

const toneContainer: Record<PillTone, string> = {
  neutral: 'bg-surface-muted border border-line',
  primary: 'bg-primary-50 border border-primary-200',
  accent: 'bg-accent-50 border border-accent-200',
  danger: 'bg-danger-50 border border-danger-200',
  success: 'bg-success-50 border border-success-100',
  info: 'bg-info-50 border border-info-100',
};

const toneText: Record<PillTone, string> = {
  neutral: 'text-ink-secondary',
  primary: 'text-primary-700',
  accent: 'text-accent-700',
  danger: 'text-danger-700',
  success: 'text-success-700',
  info: 'text-info-600',
};

const sizeContainer = {
  sm: 'h-6 px-2 gap-1',
  md: 'h-7 px-2.5 gap-1.5',
};

const sizeText = {
  sm: 'text-[10px]',
  md: 'text-xs',
};

export function Pill({
  tone = 'neutral',
  size = 'sm',
  icon,
  children,
  className,
  textClassName,
  style,
  ...rest
}: PillProps) {
  return (
    <View
      style={style}
      className={cn(
        'flex-row items-center self-start rounded-full',
        toneContainer[tone],
        sizeContainer[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {typeof children === 'string' ? (
        <Text
          className={cn(
            'font-semibold',
            sizeText[size],
            toneText[tone],
            textClassName,
          )}
          numberOfLines={1}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
