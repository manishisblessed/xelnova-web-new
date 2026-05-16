import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Loader2, Plus, X } from 'lucide-react-native';
import { Image } from '@xelnova/ui-native';
import { uploadImageFromUri } from '../lib/upload';

interface PhotoPickerProps {
  /** Current uploaded image URLs. Controlled component. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Hard cap on simultaneously attached photos. */
  max?: number;
  /** Visible helper line. */
  hint?: string;
}

/**
 * Reusable photo picker that uploads each selected image to Cloudinary via
 * `/upload/image` and stores the resulting URLs. Used for return requests
 * (and reusable for future review-with-photos flows).
 */
export function PhotoPicker({
  value,
  onChange,
  max = 3,
  hint = 'Add up to 3 photos showing the issue',
}: PhotoPickerProps) {
  const [busy, setBusy] = useState(false);

  const remaining = Math.max(0, max - value.length);

  const pick = async () => {
    if (remaining === 0) {
      Alert.alert('Limit reached', `You can attach up to ${max} photos.`);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'We need photo access to attach images. Enable it from Settings.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (result.canceled || !result.assets?.length) return;

    setBusy(true);
    const next = [...value];
    try {
      for (const asset of result.assets.slice(0, remaining)) {
        try {
          const url = await uploadImageFromUri({
            uri: asset.uri,
            mime: asset.mimeType ?? 'image/jpeg',
            name: asset.fileName ?? `upload-${Date.now()}.jpg`,
          });
          next.push(url);
        } catch (e: any) {
          Alert.alert('Upload failed', e?.message ?? 'Could not upload one of the photos.');
        }
      }
      onChange(next);
    } finally {
      setBusy(false);
    }
  };

  const remove = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2 flex-wrap">
        {value.map((uri, idx) => (
          <View
            key={uri}
            className="w-20 h-20 rounded-xl bg-surface-muted overflow-hidden border border-line-light relative"
          >
            <Image uri={uri} className="w-full h-full" contentFit="cover" />
            <Pressable
              onPress={() => remove(idx)}
              hitSlop={8}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 items-center justify-center"
            >
              <X size={14} color="#ffffff" />
            </Pressable>
          </View>
        ))}
        {remaining > 0 ? (
          <Pressable
            onPress={pick}
            disabled={busy}
            className="w-20 h-20 rounded-xl bg-surface border-2 border-dashed border-line items-center justify-center active:bg-surface-muted"
          >
            {busy ? (
              <Loader2 size={18} color="#11ab3a" />
            ) : (
              <>
                <Plus size={18} color="#1a1a2e" />
                <View className="flex-row items-center gap-1 mt-1">
                  <Camera size={10} color="#5a6478" />
                  <Text className="text-[10px] text-ink-secondary">Photo</Text>
                </View>
              </>
            )}
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text className="text-xs text-ink-muted">{hint}</Text> : null}
    </View>
  );
}
