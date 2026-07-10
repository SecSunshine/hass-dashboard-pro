import { describe, expect, it } from 'vitest';
import {
  formatTemperatureCelsius,
  isTemperatureUnit,
  normalizeTemperatureToCelsius,
  shouldConvertFahrenheitToCelsius,
} from './temperature';

describe('temperature utilities', () => {
  it('normalizes explicit Fahrenheit values to Celsius', () => {
    expect(isTemperatureUnit('°F')).toBe(true);
    expect(isTemperatureUnit('℉')).toBe(true);
    expect(normalizeTemperatureToCelsius('72', '°F')).toBe(22.2);
    expect(formatTemperatureCelsius(22.2)).toBe('22.2°C');
  });

  it('corrects obvious Fahrenheit values mislabeled as Celsius', () => {
    expect(isTemperatureUnit('℃')).toBe(true);
    expect(shouldConvertFahrenheitToCelsius(72, '°C')).toBe(true);
    expect(normalizeTemperatureToCelsius('72', '°C')).toBe(22.2);
    expect(normalizeTemperatureToCelsius('22', '°C')).toBe(22);
  });
});
