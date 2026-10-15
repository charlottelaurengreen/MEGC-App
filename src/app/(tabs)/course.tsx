import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Btn, ErrorBox, Label, Loading, Page, Panel, Scroll, Small, TopHeader } from '@/components/ui';
import { getHoles, type Hole } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

/** Distance in yards between two coordinates (haversine). */
function yards(a: { latitude: number; longitude: number }, lat: number, lng: number) {
  const R = 6_371_000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat - a.latitude);
  const dLng = rad(lng - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round((2 * R * Math.asin(Math.sqrt(h))) / 0.9144);
}

export default function Course() {
  const { data: holes, error, reload } = useQuery(getHoles);
  const [i, setI] = useState(0);
  const [pos, setPos] = useState<Location.LocationObjectCoords | null>(null);
  const [gps, setGps] = useState<'off' | 'denied' | 'on'>('off');

  const hasGreens = !!holes?.some((h) => h.green_lat != null);

  useEffect(() => {
    if (!hasGreens) return;
    let sub: Location.LocationSubscription | undefined;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) return setGps('denied');
      setGps('on');
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 2, timeInterval: 1000 }, (l) => setPos(l.coords));
    })();
    return () => sub?.remove();
  }, [hasGreens]);

  if (error) return <Page><TopHeader title="The course" /><Scroll><ErrorBox message={error} onRetry={reload} /></Scroll></Page>;
  if (!holes) return <Page><TopHeader title="The course" /><Loading /></Page>;

  const h = holes[i];
  const par = holes.reduce((a, x) => a + x.par, 0);
  const go = (k: number) => setI((k + holes.length) % holes.length);
  const toGreen = pos && h.green_lat != null && h.green_lng != null ? yards(pos, h.green_lat, h.green_lng) : null;

  return (
    <Page>
      <TopHeader title="The course" subtitle={`Par ${par} · Ben Sayers design, remodelled by James Braid in 1936`} />
      <Scroll gap={20}>
        <Panel style={{ paddingVertical: 14, paddingHorizontal: 12, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={() => go(i - 1)} accessibilityRole="button" accessibilityLabel="Previous hole" style={st.step}><Icon name="back" color={C.gold} /></Pressable>
            <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <Label style={{ color: C.gold }}>{i < 9 ? 'Front nine' : 'Back nine'}</Label>
              <Text style={{ fontSize: 28, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: C.white }}>Hole {h.hole}</Text>
            </View>
            <Pressable onPress={() => go(i + 1)} accessibilityRole="button" accessibilityLabel="Next hole" style={st.step}><Icon name="chevron" color={C.gold} /></Pressable>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: C.hairOnBlue, paddingTop: 10 }}>
            <Stat k="Par" v={h.par} />
            <Stat k="Yards" v={h.yards} />
            <Stat k="Stroke index" v={h.stroke_index} />
          </View>
        </Panel>

        <View style={{ gap: 10 }} accessibilityLabel="Choose a hole">
          {[holes.slice(0, 9), holes.slice(9)].map((nine, n) => (
            <View key={n} style={{ gap: 6 }}>
              <Label style={{ color: C.muted }}>{n === 0 ? 'Front nine' : 'Back nine'}</Label>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {nine.map((x: Hole) => {
                  const on = x.hole === h.hole;
                  return (
                    <Pressable key={x.hole} onPress={() => setI(x.hole - 1)} accessibilityRole="button" accessibilityState={{ selected: on }}
                      accessibilityLabel={`Hole ${x.hole}, par ${x.par}`} style={[st.hole, on && { backgroundColor: C.blue, borderColor: C.blue }]}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: on ? C.gold : C.blue }}>{x.hole}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <View style={st.dist}>
          <Label style={{ color: C.gold }}>To the middle of the green</Label>
          <Text style={{ fontSize: 48, fontWeight: '700', color: C.white }}>{toGreen != null ? toGreen : '—'}</Text>
          <Small style={{ color: C.dim }}>
            {!hasGreens ? 'GPS distances appear once the club adds green positions.'
              : gps === 'denied' ? 'Allow location access in Settings to see distances.'
              : toGreen == null ? 'Finding your position…' : 'Yards · live GPS'}
          </Small>
        </View>

        <Btn label="Start scorecard" variant="gold" href="/scorecard" />
      </Scroll>
    </Page>
  );
}

const Stat = ({ k, v }: { k: string; v: number }) => (
  <View style={{ alignItems: 'center', gap: 2 }}>
    <Label style={{ color: C.gold }}>{k}</Label>
    <Text style={{ fontSize: 20, fontWeight: '700', color: C.white }}>{v}</Text>
  </View>
);

const st = StyleSheet.create({
  step: { width: 44, height: 44, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  hole: { flex: 1, height: 44, borderWidth: 1, borderColor: C.gray, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  dist: { backgroundColor: C.green, padding: 20, alignItems: 'center', gap: 6 },
});
