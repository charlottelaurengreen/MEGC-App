// Current conditions at the club from Open-Meteo (free, no API key).
const CLUB = { lat: 55.9246, lng: -3.2116 };

const WIND = [
  [1, 'Calm'], [12, 'Light breeze'], [29, 'Moderate breeze'], [39, 'Fresh breeze'],
  [50, 'Strong breeze'], [62, 'Near gale'], [Infinity, 'Gale'],
] as const;

export async function getWeather(): Promise<{ temp: number; wind: string } | null> {
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${CLUB.lat}&longitude=${CLUB.lng}&current=temperature_2m,wind_speed_10m&wind_speed_unit=kmh`,
    );
    const j = await r.json();
    const kmh: number = j.current.wind_speed_10m;
    return { temp: Math.round(j.current.temperature_2m), wind: WIND.find(([max]) => kmh < max)![1] };
  } catch {
    return null;
  }
}
