import { Env } from '../src/index.js';
import { it, vi, expect, afterEach } from 'vitest';

function validateZone(zone: string): string {
	const env = Env.create({
		ENV_TIMEZONE_CACHE_TEST: Env.schema.timezone({
			defaultValue: zone,
		}),
	});

	return env.get('ENV_TIMEZONE_CACHE_TEST');
}

afterEach(() => {
	vi.restoreAllMocks();
});

it('reuses successful timezone validation across environment instances', () => {
	const formatter = vi.spyOn(Intl, 'DateTimeFormat');

	expect(validateZone('Pacific/Tahiti')).toBe('Pacific/Tahiti');
	expect(validateZone('Pacific/Tahiti')).toBe('Pacific/Tahiti');
	expect(formatter).toHaveBeenCalledTimes(1);
});

it('keeps rejecting invalid timezones instead of caching failures', () => {
	const formatter = vi.spyOn(Intl, 'DateTimeFormat');

	expect(() => validateZone('Invalid/CacheTest')).toThrow('expected supported time zone');
	expect(() => validateZone('Invalid/CacheTest')).toThrow('expected supported time zone');
	expect(formatter).toHaveBeenCalledTimes(2);
});

it('evicts old entries and validates them again after many distinct zones', () => {
	const zones = Intl.supportedValuesOf('timeZone');
	validateZone('Etc/UTC');
	for (const zone of zones) {
		expect(validateZone(zone)).toBe(zone);
	}

	const formatter = vi.spyOn(Intl, 'DateTimeFormat');

	expect(validateZone('Etc/UTC')).toBe('Etc/UTC');
	expect(formatter).toHaveBeenCalledTimes(1);
});
