import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { cn } from './cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'add';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  textClassName?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const containerVariants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 active:bg-primary-600',
  secondary: 'bg-surface-muted active:bg-line border border-line',
  outline: 'bg-surface border border-line active:bg-surface-muted',
  ghost: 'bg-transparent active:bg-surface-muted',
  danger: 'bg-danger-500 active:bg-danger-600',
  add: 'bg-surface border-2 border-primary-500 active:bg-primary-50',
};

const textVariants: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-ink',
  outline: 'text-ink',
  ghost: 'text-ink-secondary',
  danger: 'text-white',
  add: 'text-primary-600',
};

const containerSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 rounded-md',
  md: 'h-11 px-5 rounded-lg',
  lg: 'h-14 px-6 rounded-xl',
};

const textSizes: Record<ButtonSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    disabled,
    className,
    textClassName,
    style,
    children,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      ref={ref}
      disabled={isDisabled}
      style={style}
      className={cn(
        'flex-row items-center justify-center gap-2',
        containerSizes[size],
        containerVariants[variant],
        fullWidth && 'w-full',
        isDisabled && 'opacity-60',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#fff' : '#11ab3a'}
        />
      ) : null}
      {!loading && leftIcon}
      {typeof children === 'string' ? (
        <Text
          className={cn(
            'font-semibold tracking-tight',
            textSizes[size],
            textVariants[variant],
            textClassName,
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
      {!loading && rightIcon}
    </Pressable>
  );
});
