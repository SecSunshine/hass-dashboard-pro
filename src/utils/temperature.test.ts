import { describe, expect, it } from 'vitest';
import {
  formatTemperatureCelsius,
  isAmbientTemperatureEntity,
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

  it('corrects implausible indoor Fahrenheit readings such as 47°C', () => {
    expect(shouldConvertFahrenheitToCelsius(47, '°C')).toBe(true);
    expect(normalizeTemperatureToCelsius('47', '°C')).toBe(8.3);
  });

  it('excludes device diagnostic temperatures from ambient room summaries', () => {
    expect(isAmbientTemperatureEntity(
      'sensor.lumi_cn_578723965_acn05_chip_temperature_p_17_1',
      null,
      '°C',
      'Aqara 空调伴侣 P3 芯片温度',
    )).toBe(false);
    expect(isAmbientTemperatureEntity('sensor.nas_cpu_temperature', 'temperature', '°C', 'CPU 温度')).toBe(false);
    expect(isAmbientTemperatureEntity('sensor.master_bedroom_temperature', 'temperature', '°C', '主卧温度')).toBe(true);
  });
});
