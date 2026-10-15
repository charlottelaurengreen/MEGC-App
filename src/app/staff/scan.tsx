import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Band, BarHeader, Btn, Card, ErrorBox, KV, Page, Scroll, Small, Title } from '@/components/ui';
import { staffCheckIn, staffLookupCard, type CardLookup } from '@/lib/api';
import * as f from '@/lib/format';
import { C } from '@/theme';

export default function ScanCard() {
  const [permission, requestPermission] = useCameraPermissions();
  const focused = useIsFocused();
  const [found, setFound] = useState<CardLookup | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handling = useRef(false);

  const onScan = async ({ data }: { data: string }) => {
    if (handling.current || found) return;
    handling.current = true;
    setErr(null);
    try {
      setFound(await staffLookupCard(data));
    } catch (e) {
      setErr((e as Error).message);
      setTimeout(() => (handling.current = false), 1500); // let them try again
    }
  };

  const reset = () => {
    setFound(null);
    setErr(null);
    handling.current = false;
  };

  const checkIn = async () => {
    if (!found?.booking_id) return;
    setBusy(true);
    try {
      await staffCheckIn(found.booking_id);
      setFound({ ...found, checked_in_at: new Date().toISOString() });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const expired = found?.valid_to && new Date(found.valid_to + 'T23:59:59') < new Date();

  return (
    <Page>
      <BarHeader title="Scan card" />
      <Scroll gap={18}>
        {!permission ? null : !permission.granted ? (
          <Card>
            <Title>Camera access needed</Title>
            <Small>The camera reads the QR code on a member’s card.</Small>
            <Btn label="Allow camera" variant="gold" onPress={requestPermission} />
          </Card>
        ) : !found ? (
          <>
            <View style={{ height: 320, backgroundColor: C.blue, overflow: 'hidden' }}>
              {focused && (
                <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />
              )}
            </View>
            <Small style={{ color: C.muted, textAlign: 'center' }}>Point the camera at the QR code on the member’s card in their app.</Small>
          </>
        ) : (
          <>
            <Card>
              <Title style={{ fontSize: 20 }}>{found.name}</Title>
              <KV k="Member no." v={found.member_no} />
              <KV k="Category" v={found.category} />
              {found.valid_to && <KV k="Valid to" v={f.fullDate(found.valid_to + 'T12:00:00Z')} />}
            </Card>
            {expired && <ErrorBox message="This membership has expired." />}
            {found.booking_id && found.starts_at ? (
              found.checked_in_at ? (
                <Band icon="check" title={`Checked in · ${f.time(found.starts_at)} tee time`} sub={`${found.players} player(s)`} />
              ) : (
                <>
                  <Card>
                    <KV k="Today’s tee time" v={f.time(found.starts_at)} />
                    <KV k="Players" v={String(found.players)} />
                  </Card>
                  <Btn label="Check in" variant="gold" onPress={checkIn} loading={busy} />
                </>
              )
            ) : (
              <Small style={{ color: C.muted }}>No tee time booked today.</Small>
            )}
            <Btn label="Scan another card" variant="line" onPress={reset} />
          </>
        )}
        {err && <ErrorBox message={err} />}
      </Scroll>
    </Page>
  );
}
