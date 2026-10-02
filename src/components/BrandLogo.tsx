import { Image, View } from 'react-native';

type BrandLogoProps = {
  size?: number;
};

export function BrandLogo({ size = 36 }: BrandLogoProps) {
  const imageHeight = Math.round(size * (1199 / 1312));

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="TeckUP logo"
      style={{
        width: size + 8,
        height: size + 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
      }}
    >
      <Image
        source={require('../../techupImage.png')}
        resizeMode="contain"
        style={{ width: size, height: imageHeight }}
      />
    </View>
  );
}