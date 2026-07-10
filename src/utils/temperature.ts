export type TemperatureUnit = 'celsius' | 'fahrenheit';

export function normalizeTemperatureUnit(unit: unknown): TemperatureUnit | null {
  const normalized = String(unit || '').trim().toLowerCase();
  if (['°c', '℃', 'c', 'celsius', 'degrees celsius', '掳c'].includes(normalized)) return 'celsius';
  if (['°f', '℉', 'f', 'fahrenheit', 'degrees fahrenheit', '掳f'].includes(normalized)) return 'fahrenheit';
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
  return (normalizedUnit === 'celsius' || normalizedUnit === null) && value > 60 && value < 140;
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
  return `${value.toFixed(precision).replace(/\.0$/, '')}°C`;
}
