export function Pressable(_: unknown) {
  return null;
}

export function SafeAreaView(_: unknown) {
  return null;
}

export const ScrollView = SafeAreaView;
export const Text = SafeAreaView;
export const TextInput = SafeAreaView;
export const View = SafeAreaView;

export const StyleSheet = {
  create<T>(styles: T): T {
    return styles;
  },
};
