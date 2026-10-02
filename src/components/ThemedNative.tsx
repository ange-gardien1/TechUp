import type { ComponentProps, ReactNode } from 'react';
import { createContext, useContext } from 'react';
import {
  KeyboardAvoidingView as NativeKeyboardAvoidingView,
  Pressable as NativePressable,
  ScrollView as NativeScrollView,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  View as NativeView,
} from 'react-native';
import type { PressableStateCallbackType, TextStyle, ViewStyle } from 'react-native';
import { useAppTheme } from '../providers/AppThemeProvider';
import { LinearGradient as NativeLinearGradient } from 'expo-linear-gradient';

export * from 'react-native';

type ThemeTone = 'page' | 'surface' | 'input' | 'accent';
const ThemeToneContext = createContext<ThemeTone>('page');

const lightClassColors: Record<string, string> = {
  'bg-[#040B18]': 'bg-[#F5F8FC]',
  'bg-[#040B16]': 'bg-[#F5F8FC]',
  'bg-[#07142F]': 'bg-[#F5F8FC]',
  'bg-[#09111F]': 'bg-[#F5F8FC]',
  'bg-[#0B1220]': 'bg-[#F5F8FC]',
  'bg-[#0D1B38]': 'bg-white',
  'bg-[#101F3D]': 'bg-[#EFF4FB]',
  'bg-[#0A162C]': 'bg-[#EFF4FB]',
  'bg-[#111827]': 'bg-white',
  'bg-[#0F172A]': 'bg-[#EFF4FB]',
  'bg-[#14161A]': 'bg-white',
  'bg-[#1B1E24]': 'bg-white',
  'border-[#1C2D4A]': 'border-slate-200',
  'border-[#263955]': 'border-slate-200',
  'border-slate-700': 'border-slate-200',
};

const lightTextColors: Record<string, string> = {
  'text-slate-50': 'text-slate-900',
  'text-slate-100': 'text-slate-800',
  'text-slate-200': 'text-slate-700',
  'text-slate-300': 'text-slate-600',
  'text-slate-400': 'text-slate-500',
};

const lightHexColors: Record<string, string> = {
  '#040B18': '#F5F8FC',
  '#040B16': '#F5F8FC',
  '#07142F': '#F5F8FC',
  '#09111F': '#F5F8FC',
  '#0B1220': '#F5F8FC',
  '#0D1B38': '#FFFFFF',
  '#101F3D': '#EFF4FB',
  '#0A162C': '#EFF4FB',
  '#111827': '#FFFFFF',
  '#0F172A': '#EFF4FB',
  '#14161A': '#FFFFFF',
  '#1B1E24': '#FFFFFF',
  '#1C2D4A': '#E2E8F0',
  '#263955': '#E2E8F0',
  '#26344A': '#E2E8F0',
  '#FFFFFF': '#0B1437',
  '#94A3B8': '#64748B',
};

function lightHexColor(color: string, property: 'background' | 'border' | 'text') {
  const normalized = color.toUpperCase();
  if (property === 'background' && normalized === '#FFFFFF') return '#FFFFFF';
  if (lightHexColors[normalized]) return lightHexColors[normalized];
  if (!/^#[0-9A-F]{6}$/.test(normalized)) return color;
  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  if (property === 'text') return luminance < 0.62 ? '#334155' : color;
  if (property === 'border') return luminance < 0.78 ? '#E2E8F0' : color;
  if (luminance >= 0.39) return color;
  const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
  const mix = saturation > 55 ? 0.88 : 0.97;
  const lighten = (channel: number) => Math.round(channel + (255 - channel) * mix).toString(16).padStart(2, '0');
  return `#${lighten(red)}${lighten(green)}${lighten(blue)}`.toUpperCase();
}

function lightToken(token: string) {
  if (lightClassColors[token] || lightTextColors[token]) {
    return lightClassColors[token] ?? lightTextColors[token] ?? token;
  }
  const backgroundMatch = token.match(/^bg-\[#([0-9A-Fa-f]{6})\]$/);
  if (backgroundMatch) {
    const lightColor = lightHexColor(`#${backgroundMatch[1]}`, 'background');
    return lightColor === '#F5F8FC' ? 'bg-[#F5F8FC]' : 'bg-white';
  }
  const borderMatch = token.match(/^border-\[#([0-9A-Fa-f]{6})\]$/);
  if (borderMatch) return 'border-slate-200';
  const slateBackground = token.match(/^bg-(?:slate|gray|zinc|neutral)-([0-9]{2,3})$/);
  if (slateBackground) {
    const shade = Number(slateBackground[1]);
    if (shade >= 700) return shade >= 800 ? 'bg-white' : 'bg-[#F5F8FC]';
    if (shade >= 500) return 'bg-[#EFF4FB]';
  }
  const slateBorder = token.match(/^border-(?:slate|gray|zinc|neutral)-([0-9]{2,3})$/);
  if (slateBorder && Number(slateBorder[1]) >= 500) return 'border-slate-200';
  const slateText = token.match(/^text-(?:slate|gray|zinc|neutral)-([0-9]{2,3})$/);
  if (slateText) {
    const shade = Number(slateText[1]);
    if (shade <= 200) return 'text-slate-800';
    if (shade <= 400) return 'text-slate-600';
  }
  return token;
}

function lightClassName(className: string | undefined, isDark: boolean) {
  if (isDark || !className) return className;
  return className
    .split(/\s+/)
    .map(lightToken)
    .join(' ');
}

function toneForClassName(
  className: string | undefined,
  parent: ThemeTone,
  style?: ComponentProps<typeof NativeView>['style'],
): ThemeTone {
  const backgroundColor = StyleSheet.flatten(style)?.backgroundColor;
  if (
    (typeof backgroundColor === 'string' && /^#(?:1677FF|1769F5|2563EB)$/i.test(backgroundColor)) ||
    /(?:^|\s)bg-(?:\[#(?:1677FF|1769F5|2563EB)\]|(?:blue|cyan|emerald|rose|violet)-(?:[5-9]\d{2}|950))/i.test(className ?? '')
  ) {
    return 'accent';
  }
  if (/(?:^|\s)bg-\[#101F3D\]/i.test(className ?? '')) return 'input';
  if (/(?:^|\s)bg-(?:\[#(?:0D1B38|111827|14161A|1B1E24)\]|white)/i.test(className ?? '')) return 'surface';
  if (/(?:^|\s)bg-\[#(?:040B18|040B16|07142F|09111F|0B1220)\]/i.test(className ?? '')) return 'page';
  if (typeof backgroundColor === 'string') {
    if (/^#(?:0D1B38|111827|14161A|1B1E24)$/i.test(backgroundColor)) return 'surface';
    if (/^#(?:101F3D|0A162C)$/i.test(backgroundColor)) return 'input';
    if (/^#(?:040B18|040B16|07142F|09111F|0B1220)$/i.test(backgroundColor)) return 'page';
  }
  return parent;
}

function themedViewStyle(style: ComponentProps<typeof NativeView>['style'], isDark: boolean) {
  const flattened = StyleSheet.flatten(style);
  if (isDark || !flattened) return style;
  const next = { ...flattened } as ViewStyle & { color?: string };
  if (typeof next.backgroundColor === 'string') {
    next.backgroundColor = lightHexColor(next.backgroundColor, 'background');
  }
  if (typeof next.borderColor === 'string') {
    next.borderColor = lightHexColor(next.borderColor, 'border');
  }
  if (typeof next.color === 'string') {
    next.color = lightHexColor(next.color, 'text');
  }
  return next;
}

function themedTextStyle(style: ComponentProps<typeof NativeText>['style'], isDark: boolean, tone: ThemeTone) {
  const flattened = StyleSheet.flatten(style);
  if (isDark || !flattened) return style;
  const next = { ...flattened } as TextStyle;
  if (typeof next.color === 'string') {
    const color = next.color.toUpperCase();
    next.color = color === '#FFFFFF' && tone === 'accent'
      ? '#FFFFFF'
      : lightHexColor(color, 'text');
  }
  return next;
}

type ClassNameProp = { className?: string };

export function View({ className, style, children, ...props }: ComponentProps<typeof NativeView> & ClassNameProp) {
  const { isDark } = useAppTheme();
  const parentTone = useContext(ThemeToneContext);
  const tone = toneForClassName(className, parentTone, style);
  return (
    <ThemeToneContext.Provider value={tone}>
      <NativeView {...props} className={lightClassName(className, isDark)} style={themedViewStyle(style, isDark)}>
        {children}
      </NativeView>
    </ThemeToneContext.Provider>
  );
}

export function Pressable({ className, style, children, ...props }: ComponentProps<typeof NativePressable> & ClassNameProp) {
  const { isDark } = useAppTheme();
  const parentTone = useContext(ThemeToneContext);
  const tone = toneForClassName(className, parentTone, typeof style === 'function' ? undefined : style);
  const themedStyle = typeof style === 'function'
    ? (state: PressableStateCallbackType) => themedViewStyle(style(state), isDark)
    : themedViewStyle(style, isDark);
  return (
    <ThemeToneContext.Provider value={tone}>
      <NativePressable {...props} className={lightClassName(className, isDark)} style={themedStyle}>
        {children}
      </NativePressable>
    </ThemeToneContext.Provider>
  );
}

export function Text({ className, style, children, ...props }: ComponentProps<typeof NativeText> & ClassNameProp) {
  const { isDark } = useAppTheme();
  const tone = useContext(ThemeToneContext);
  const mappedClassName = lightClassName(className, isDark);
  const shouldUseDarkText = !isDark && tone !== 'accent' && mappedClassName?.split(/\s+/).includes('text-white');
  const adjustedClassName = shouldUseDarkText
    ? mappedClassName?.replace(/(?:^|\s)text-white(?=\s|$)/, ' text-[#0B1437]')
    : mappedClassName;
  return (
    <NativeText {...props} className={adjustedClassName} style={themedTextStyle(style, isDark, tone)}>
      {children}
    </NativeText>
  );
}

export function TextInput({ className, style, placeholderTextColor, ...props }: ComponentProps<typeof NativeTextInput> & ClassNameProp) {
  const { isDark } = useAppTheme();
  const tone = useContext(ThemeToneContext);
  const placeholder = typeof placeholderTextColor === 'string' ? placeholderTextColor.toUpperCase() : undefined;
  return (
    <NativeTextInput
      {...props}
      className={lightClassName(className, isDark)}
      style={themedTextStyle(style, isDark, tone)}
      placeholderTextColor={!isDark && placeholder ? lightHexColor(placeholder, 'text') : placeholderTextColor}
    />
  );
}

function ThemeContainer({
  children,
  tone,
}: {
  children: ReactNode;
  tone: ThemeTone;
}) {
  return <ThemeToneContext.Provider value={tone}>{children}</ThemeToneContext.Provider>;
}

export function ScrollView({ className, style, children, ...props }: ComponentProps<typeof NativeScrollView> & ClassNameProp) {
  const { isDark } = useAppTheme();
  const parentTone = useContext(ThemeToneContext);
  const tone = toneForClassName(className, parentTone, style);
  return (
    <ThemeContainer tone={tone}>
      <NativeScrollView {...props} className={lightClassName(className, isDark)} style={themedViewStyle(style, isDark)}>
        {children}
      </NativeScrollView>
    </ThemeContainer>
  );
}

export function KeyboardAvoidingView({
  className,
  style,
  children,
  ...props
}: ComponentProps<typeof NativeKeyboardAvoidingView> & ClassNameProp) {
  const { isDark } = useAppTheme();
  const parentTone = useContext(ThemeToneContext);
  const tone = toneForClassName(className, parentTone, style);
  return (
    <ThemeContainer tone={tone}>
      <NativeKeyboardAvoidingView
        {...props}
        className={lightClassName(className, isDark)}
        style={themedViewStyle(style, isDark)}
      >
        {children}
      </NativeKeyboardAvoidingView>
    </ThemeContainer>
  );
}

export function LinearGradient({ children, ...props }: ComponentProps<typeof NativeLinearGradient>) {
  return (
    <ThemeToneContext.Provider value="accent">
      <NativeLinearGradient {...props}>{children}</NativeLinearGradient>
    </ThemeToneContext.Provider>
  );
}
