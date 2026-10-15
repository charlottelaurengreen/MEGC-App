import { router, type Href } from 'expo-router';
import { Children, type PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, T } from '@/theme';
import { Icon, type IconName } from './icon';

// ─── Text ──────────────────────────────────────────────────────────────────

type TxtProps = PropsWithChildren<{ style?: StyleProp<TextStyle>; numberOfLines?: number }>;
export const Display = ({ children, style }: TxtProps) => <Text accessibilityRole="header" style={[T.display, { color: C.white }, style]}>{children}</Text>;
export const Big = ({ children, style }: TxtProps) => <Text style={[T.big, { color: C.white }, style]}>{children}</Text>;
export const Label = ({ children, style }: TxtProps) => <Text style={[T.label, { color: C.blue }, style]}>{children}</Text>;
export const Small = ({ children, style, numberOfLines }: TxtProps) => <Text numberOfLines={numberOfLines} style={[T.small, { color: C.blue }, style]}>{children}</Text>;
export const Body = ({ children, style }: TxtProps) => <Text style={[T.body, { color: C.blue }, style]}>{children}</Text>;
export const Title = ({ children, style, numberOfLines }: TxtProps) => <Text numberOfLines={numberOfLines} style={[T.title, { color: C.blue }, style]}>{children}</Text>;

export const GoldRule = () => <View style={{ width: 32, height: 2, backgroundColor: C.gold }} />;

/** Section heading in wide-tracked capitals with the Gold rule beneath. */
export function H({ children, onBlue, action }: PropsWithChildren<{ onBlue?: boolean; action?: { label: string; href: Href } }>) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ gap: 10 }}>
        <Text accessibilityRole="header" style={[T.h, { color: onBlue ? C.white : C.blue }]}>{children}</Text>
        <GoldRule />
      </View>
      {action && (
        <Pressable onPress={() => router.push(action.href)} hitSlop={12}>
          <Text style={[T.label, { color: C.blue, textDecorationLine: 'underline' }]}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Screen chrome ─────────────────────────────────────────────────────────

/** Large blue header used on tab screens. */
export function TopHeader({ title, subtitle, children }: PropsWithChildren<{ title?: string; subtitle?: string }>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.top, { paddingTop: insets.top + 20 }]}>
      {title && (
        <>
          <Display>{title}</Display>
          <GoldRule />
        </>
      )}
      {subtitle && <Small style={{ color: C.dim }}>{subtitle}</Small>}
      {children}
    </View>
  );
}

/** Compact blue bar with a back button, used on pushed screens. */
export function BarHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingTop: insets.top + 4 }]}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={s.iconBtn}>
        <Icon name="back" size={24} color={C.gold} />
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={[T.h, { flex: 1, textAlign: 'center', color: C.white }]}>{title}</Text>
      <View style={s.iconBtn} />
    </View>
  );
}

export function Scroll({ children, gap = 28, onRefresh, refreshing = false }: PropsWithChildren<{ gap?: number; onRefresh?: () => void; refreshing?: boolean }>) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.white }}
      contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 40, gap }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} /> : undefined}>
      {children}
    </ScrollView>
  );
}

export const Page = ({ children, bg = C.white }: PropsWithChildren<{ bg?: string }>) => (
  <View style={{ flex: 1, backgroundColor: bg }}>{children}</View>
);

// ─── Blocks ────────────────────────────────────────────────────────────────

export const Sec = ({ children, gap = 14 }: PropsWithChildren<{ gap?: number }>) => <View style={{ gap }}>{children}</View>;

export const Panel = ({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) => (
  <View style={[s.panel, style]}>{children}</View>
);

export const Card = ({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) => (
  <View style={[s.card, style]}>{children}</View>
);

export function Band({ icon, title, sub }: { icon: IconName; title: string; sub?: string }) {
  return (
    <View accessibilityRole="alert" style={s.band}>
      <Icon name={icon} color={C.white} strokeWidth={2} />
      <View style={{ flex: 1, gap: 2 }}>
        <Title style={{ color: C.white }}>{title}</Title>
        {sub && <Small style={{ color: C.white }}>{sub}</Small>}
      </View>
    </View>
  );
}

export const Note = ({ children }: PropsWithChildren) => (
  <View style={[s.card, { flexDirection: 'row', gap: 12, backgroundColor: C.paper, borderColor: C.paper }]}>
    <Icon name="info" size={20} color={C.blue} />
    <Small style={{ flex: 1 }}>{children}</Small>
  </View>
);

export function KV({ k, v, onBlue, strong }: { k: string; v: ReactNode; onBlue?: boolean; strong?: boolean }) {
  const color = onBlue ? C.white : C.blue;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ fontSize: strong ? 16 : 14, color: onBlue ? C.dim : C.muted, fontWeight: strong ? '700' : '400', flexShrink: 1 }}>{k}</Text>
      <Text style={{ fontSize: strong ? 16 : 14, color, fontWeight: '700', textAlign: 'right', flexShrink: 1 }}>{v}</Text>
    </View>
  );
}

export const Rule = ({ onBlue }: { onBlue?: boolean }) => <View style={{ height: 1, backgroundColor: onBlue ? C.hairOnBlue : C.gray }} />;

export function Tag({ label, tone = 'gray' }: { label: string; tone?: 'gray' | 'blue' | 'green' }) {
  const bg = tone === 'blue' ? C.blue : tone === 'green' ? C.green : C.gray;
  const fg = tone === 'blue' ? C.gold : tone === 'green' ? C.white : C.blue;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: fg }}>{label}</Text>
    </View>
  );
}

export function IconTile({ name, bg = C.blue, fg = C.gold }: { name: IconName; bg?: string; fg?: string }) {
  return (
    <View style={{ width: 40, height: 40, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} color={fg} />
    </View>
  );
}

/** List row: icon tile, title + subtitle, optional trailing content or chevron. */
export function Row({ icon, iconBg, iconFg, leading, title, sub, href, onPress, right, chevron = !!(href || onPress) }: {
  icon?: IconName; iconBg?: string; iconFg?: string; leading?: ReactNode; title: string; sub?: string;
  href?: Href; onPress?: () => void; right?: ReactNode; chevron?: boolean;
}) {
  const press = onPress ?? (href ? () => router.push(href) : undefined);
  const body = (
    <>
      {leading ?? (icon && <IconTile name={icon} bg={iconBg} fg={iconFg} />)}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Title>{title}</Title>
        {sub ? <Small style={{ color: C.muted }}>{sub}</Small> : null}
      </View>
      {right}
      {chevron && <Icon name="chevron" size={20} color={C.faint} />}
    </>
  );
  return press ? (
    <Pressable onPress={press} accessibilityRole="button" style={({ pressed }) => [s.row, pressed && { backgroundColor: C.paper }]}>{body}</Pressable>
  ) : (
    <View style={s.row}>{body}</View>
  );
}

export const List = ({ children }: PropsWithChildren) => <View style={{ borderTopWidth: 1, borderTopColor: C.gray }}>{children}</View>;

// ─── Controls ──────────────────────────────────────────────────────────────

type BtnVariant = 'blue' | 'gold' | 'line' | 'onblue' | 'ghostblue';
export function Btn({ label, onPress, href, variant = 'blue', sm, disabled, loading, style, accessibilityLabel }: {
  label: string; onPress?: () => void; href?: Href; variant?: BtnVariant; sm?: boolean; disabled?: boolean;
  loading?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const v = {
    blue: { bg: C.blue, bd: C.blue, fg: C.gold },
    gold: { bg: C.gold, bd: C.gold, fg: C.blue },
    line: { bg: 'transparent', bd: C.blue, fg: C.blue },
    onblue: { bg: 'transparent', bd: C.gold, fg: C.gold },
    ghostblue: { bg: 'transparent', bd: 'transparent', fg: C.gold },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress ?? (href ? () => router.push(href) : undefined)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        s.btn,
        { minHeight: sm ? 44 : 52, paddingHorizontal: sm ? 14 : 18, backgroundColor: v.bg, borderColor: v.bd, opacity: off ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={v.fg} /> : (
        <Text style={{ color: v.fg, fontSize: sm ? 12 : 13, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', textAlign: 'center' }}>{label}</Text>
      )}
    </Pressable>
  );
}

export const Btns = ({ children }: PropsWithChildren) => (
  <View style={{ flexDirection: 'row', gap: 10 }}>
    {Children.map(children, (c) => (c ? <View style={{ flex: 1 }}>{c}</View> : null))}
  </View>
);

export function Chip({ label, on, onPress, full, onBlue }: { label: string; on?: boolean; onPress?: () => void; full?: boolean; onBlue?: boolean }) {
  const bg = full ? C.disabled : on ? (onBlue ? C.gold : C.blue) : C.white;
  const fg = full ? 'rgba(1,27,66,0.6)' : on ? (onBlue ? C.blue : C.gold) : C.blue;
  return (
    <Pressable
      onPress={full ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, disabled: !!full }}
      style={[s.chip, { backgroundColor: bg, borderColor: on && !onBlue ? C.blue : C.gray }]}>
      <Text style={{ fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: fg }}>{label}</Text>
    </Pressable>
  );
}

export const Chips = ({ children }: PropsWithChildren) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;

export function Toggle({ value, onChange, label, sub }: { value: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label} style={s.setrow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Title>{label}</Title>
        {sub && <Small style={{ color: C.muted }}>{sub}</Small>}
      </View>
      <View style={{ width: 48, height: 28, padding: 4, backgroundColor: value ? C.blue : C.gray, alignItems: value ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 20, height: 20, backgroundColor: value ? C.gold : C.white }} />
      </View>
    </Pressable>
  );
}

export function Stepper({ value, onMinus, onPlus, minusLabel, plusLabel, onBlue }: {
  value: number | string; onMinus: () => void; onPlus: () => void; minusLabel: string; plusLabel: string; onBlue?: boolean;
}) {
  const bd = onBlue ? 'rgba(255,255,255,0.4)' : C.gray;
  const fg = onBlue ? C.gold : C.blue;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: bd }}>
      <Pressable onPress={onMinus} accessibilityRole="button" accessibilityLabel={minusLabel} style={s.stepBtn}>
        <Text style={{ fontSize: 22, color: fg }}>−</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={{ minWidth: 48, textAlign: 'center', fontSize: onBlue ? 24 : 18, fontWeight: '700', color: onBlue ? C.white : C.blue }}>{value}</Text>
      <Pressable onPress={onPlus} accessibilityRole="button" accessibilityLabel={plusLabel} style={s.stepBtn}>
        <Text style={{ fontSize: 22, color: fg }}>+</Text>
      </Pressable>
    </View>
  );
}

/** Seven-day strip used for tee times and the Brasserie. */
export function DayStrip({ days, value, onChange }: { days: { iso: string; dow: string; num: string }[]; value: string; onChange: (iso: string) => void }) {
  const scrolls = days.length > 7;
  const cells = days.map((d) => {
        const on = d.iso === value;
        return (
          <Pressable
            key={d.iso}
            onPress={() => onChange(d.iso)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${d.dow} ${d.num}`}
            style={[s.day, scrolls && { flex: 0, width: 46 }, on && { backgroundColor: C.blue, borderColor: C.blue }]}>
            <Text style={{ fontSize: 10, letterSpacing: 1, color: on ? C.gold : C.blue }}>{d.dow.toUpperCase()}</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: on ? C.white : C.blue }}>{d.num}</Text>
          </Pressable>
        );
      });
  return scrolls ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginHorizontal: -16, flexGrow: 0 }}>
      <View style={{ width: 10 }} />
      {cells}
      <View style={{ width: 10 }} />
    </ScrollView>
  ) : (
    <View style={{ flexDirection: 'row', gap: 6 }}>{cells}</View>
  );
}

// ─── States ────────────────────────────────────────────────────────────────

export const Loading = () => (
  <View style={{ padding: 32, alignItems: 'center' }}>
    <ActivityIndicator color={C.blue} />
  </View>
);

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={{ borderColor: C.danger }}>
      <Title style={{ color: C.danger }}>Something went wrong</Title>
      <Small>{message}</Small>
      {onRetry && <Btn label="Try again" variant="line" sm onPress={onRetry} />}
    </Card>
  );
}

export const Empty = ({ children }: PropsWithChildren) => <Small style={{ color: C.muted, paddingVertical: 8 }}>{children}</Small>;

const s = StyleSheet.create({
  top: { backgroundColor: C.blue, paddingHorizontal: 20, paddingBottom: 22, gap: 14 },
  bar: { backgroundColor: C.blue, paddingHorizontal: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  panel: { backgroundColor: C.blue, padding: 20, gap: 12 },
  card: { borderWidth: 1, borderColor: C.gray, padding: 16, gap: 10, backgroundColor: C.white },
  band: { backgroundColor: C.green, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: C.gray, minHeight: 66 },
  setrow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: C.gray },
  btn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  chip: { minHeight: 38, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  day: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderWidth: 1, borderColor: C.gray, backgroundColor: C.white },
});
