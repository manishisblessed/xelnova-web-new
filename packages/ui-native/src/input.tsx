import { forwardRef, useState, type ComponentRef } from 'react';
import {
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { cn } from './cn';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<ComponentRef<typeof TextInput>, InputProps>(
  function Input(
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      containerClassName,
      inputClassName,
      containerStyle,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) {
    const [focused, setFocused] = useState(false);

    return (
      <View style={containerStyle} className={cn('w-full gap-1.5', containerClassName)}>
        {label ? (
          <Text className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
            {label}
          </Text>
        ) : null}

        <View
          className={cn(
            'flex-row items-center rounded-xl border bg-surface px-3.5',
            focused ? 'border-primary-500' : 'border-line',
            error && 'border-danger-500',
          )}
        >
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          <TextInput
            ref={ref}
            placeholderTextColor="#8d95a5"
            className={cn(
              'h-12 flex-1 text-base text-ink',
              inputClassName,
            )}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />
          {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
        </View>

        {error ? (
          <Text className="text-xs text-danger-600">{error}</Text>
        ) : hint ? (
          <Text className="text-xs text-ink-muted">{hint}</Text>
        ) : null}
      </View>
    );
  },
);
