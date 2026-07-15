export type TemperatureUnit = 'celsius' | 'fahrenheit';

export function normalizeTemperatureUnit(unit: unknown): TemperatureUnit | null {
  const normalized = String(unit || '').trim().toLowerCase();
  if (['\u00b0c', '\u2103', 'c', 'celsius', 'degrees celsius', 'degc'].includes(normalized)) return 'celsius';
  if (['\u00b0f', '\u2109', 'f', 'fahrenheit', 'degrees fahrenheit', 'degf'].includes(normalized)) return 'fahrenheit';
  return null;
}

export function isTemperatureUnit(unit: unknown): boolean {
  return normalizeTemperatureUnit(unit) !== null;
}

export function isTemperatureLikeEntity(entityId: unknown, deviceClass: unknown, unit: unknown): boolean {
  const normalizedDeviceClass = String(deviceClass || '').trim().toLowerCase();
  const lowerId = String(entityId || '').toLowerCase();
  return normalizedDeviceClass === 'temperature'
    || isTemperatureUnit(unit)
    || lowerId.includes('temperature')
    || lowerId.includes('temp');
}

export function shouldConvertFahrenheitToCelsius(value: number, unit: unknown): boolean {
  const normalizedUnit = normalizeTemperatureUnit(unit);
  if (normalizedUnit === 'fahrenheit') return true;
  // A number in this range is not a plausible room temperature in Celsius,
  // but is common when a Fahrenheit-only device incorrectly reports "°C".
  // Keep the guard narrow enough that real high-temperature sensors are not
  // silently converted outside the indoor dashboard range.
  return (normalizedUnit === 'celsius' || normalizedUnit === null) && value >= 45 && value < 140;
}

export function normalizeTemperatureToCelsius(raw: unknown, unit: unknown): number {
  const value = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (isNaN(value)) return NaN;
  if (shouldConvertFahrenheitToCelsius(value, unit)) {
    return Math.round(((value - 32) * 5 / 9) * 10) / 10;
  }
  return value;
}

export function formatTemperatureCelsius(value: number, precision = 1): string {
  if (isNaN(value)) return '--';
  return `${value.toFixed(precision).replace(/\.0$/, '')}\u00b0C`;
}
