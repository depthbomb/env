import { readFileSync } from 'node:fs';
import { inspect } from 'node:util';
import { it, expect, describe, beforeEach } from 'vitest';
import { Env, IPVersion, UUIDVersion, HashAlgorithm } from '../src/index.js';

const ORIGINAL_ENV = { ...process.env };

const restoreEnv = (): void => {
	for (const key of Object.keys(process.env)) {
		if (!(key in ORIGINAL_ENV)) {
			delete process.env[key];
		}
	}

	for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
};

const setEnv = (values: Record<string, string | undefined>): void => {
	for (const [key, value] of Object.entries(values)) {
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
};

const createEnv = <T extends Record<string, unknown>>(
	schema: T,
	values: Record<string, string | undefined>,
) => {
	setEnv(values);
	return Env.create(schema as never);
};

const expectSchemaError = (
	schema: Record<string, unknown>,
	values: Record<string, string | undefined>,
	message: string | RegExp,
): void => {
	setEnv(values);
	expect(() => Env.create(schema as never)).toThrow(message);
};

const loadFixtureEnv = (): Record<string, string> => {
	const fixtureText = readFileSync(new URL('./.env.fixture', import.meta.url), 'utf8');
	const vars: Record<string, string> = {};

	for (const line of fixtureText.split(/\r?\n/)) {
		const trimmedLine = line.trim();
		if (trimmedLine === '' || trimmedLine.startsWith('#')) {
			continue;
		}

		const separatorIndex = line.indexOf('=');
		if (separatorIndex === -1) {
			continue;
		}

		const key = line.slice(0, separatorIndex).trim();
		const value = line.slice(separatorIndex + 1);
		vars[key] = value;
	}

	return vars;
};

describe('Env schema validation', () => {
	beforeEach(() => {
		restoreEnv();
	});

	it('parses the .env fixture with a comprehensive schema', () => {
		const fixtureEnv = loadFixtureEnv();
		const env = createEnv(
			{
				FIXTURE_STRING: Env.schema.string({ minLength: 3, maxLength: 64 }),
				FIXTURE_NUMBER: Env.schema.number({ min: 1, max: 100 }),
				FIXTURE_INT: Env.schema.int({ positive: true }),
				FIXTURE_FLOAT: Env.schema.float({ range: [1, 2] }),
				FIXTURE_BOOLEAN: Env.schema.boolean(),
				FIXTURE_ENUM: Env.schema.enum(['typescript', 'javascript']),
				FIXTURE_JSON: Env.schema.json<{ a: number }>(),
				FIXTURE_ARRAY: Env.schema.array(Env.schema.int()),
				FIXTURE_LIST: Env.schema.list(Env.schema.enum(['typescript', 'javascript', 'bun'] as const), { unique: true }),
				FIXTURE_DURATION: Env.schema.duration({ minMs: 1_000, maxMs: 3_600_000 }),
				FIXTURE_DATE: Env.schema.date({ min: '2000-01-01T00:00:00Z', max: '2100-01-01T00:00:00Z' }),
				FIXTURE_BYTES: Env.schema.bytes({ min: 1_024, max: 1_073_741_824 }),
				FIXTURE_PATH_FILE: Env.schema.path({ type: 'file', exists: true }),
				FIXTURE_BASE64: Env.schema.base64({ padding: 'required' }),
				FIXTURE_SECRET: Env.schema.secret(),
				FIXTURE_EMAIL: Env.schema.email(),
				FIXTURE_PORT: Env.schema.port(),
				FIXTURE_URL: Env.schema.url(),
				FIXTURE_HOST: Env.schema.host(),
				FIXTURE_UUID_ANY: Env.schema.uuid(),
				FIXTURE_UUID_V4: Env.schema.uuid({ version: UUIDVersion.V4 }),
				FIXTURE_IP_V4: Env.schema.ipAddress({ version: IPVersion.V4 }),
				FIXTURE_IP_V6: Env.schema.ipAddress({ version: IPVersion.V6 }),
				FIXTURE_HASH_SHA256: Env.schema.hash(HashAlgorithm.SHA256),
				FIXTURE_HEX: Env.schema.hex(),
				FIXTURE_SEMVER: Env.schema.semver(),
				FIXTURE_TIMEZONE: Env.schema.timezone(),
				FIXTURE_OPTIONAL: Env.schema.string({ required: false }),
				FIXTURE_DEFAULT_INT: Env.schema.int({ defaultValue: 9 }),
			},
			{
				...fixtureEnv,
				FIXTURE_OPTIONAL: undefined,
				FIXTURE_DEFAULT_INT: undefined,
			},
		);

		expect(env.get('FIXTURE_STRING')).toBe('hello');
		expect(env.get('FIXTURE_NUMBER')).toBe(42);
		expect(env.get('FIXTURE_INT')).toBe(7);
		expect(env.get('FIXTURE_FLOAT')).toBe(1.5);
		expect(env.get('FIXTURE_BOOLEAN')).toBe(true);
		expect(env.get('FIXTURE_ENUM')).toBe('typescript');
		expect(env.get('FIXTURE_JSON')).toEqual({ a: 1 });
		expect(env.get('FIXTURE_ARRAY')).toEqual([1, 2, 3]);
		expect(env.get('FIXTURE_LIST')).toEqual(['typescript', 'javascript', 'bun']);
		expect(env.get('FIXTURE_DURATION')).toBe(300_000);
		expect(env.get('FIXTURE_DATE')).toBeInstanceOf(Date);
		expect(env.get('FIXTURE_BYTES')).toBe(64_000_000);
		expect(env.get('FIXTURE_PATH_FILE')).toBe('package.json');
		expect(env.get('FIXTURE_BASE64')).toBe('SGVsbG8gd29ybGQ=');
		expect(env.get('FIXTURE_SECRET').toString()).toBe('[redacted]');
		expect(`${env.get('FIXTURE_SECRET')}`).toBe('[redacted]');
		expect(env.get('FIXTURE_SECRET').release()).toBe('Se(r3tValu3!');
		expect(env.get('FIXTURE_EMAIL')).toBe('user@example.com');
		expect(env.get('FIXTURE_PORT')).toBe(3000);
		expect(env.get('FIXTURE_URL')).toBe('https://example.com/path?ok=1');
		expect(env.get('FIXTURE_HOST')).toBe('example.com');
		expect(env.get('FIXTURE_UUID_ANY')).toBe('00000000-0000-0000-0000-000000000000');
		expect(env.get('FIXTURE_UUID_V4')).toBe('217188c7-30e9-4f89-8355-0427832955ea');
		expect(env.get('FIXTURE_IP_V4')).toBe('127.0.0.1');
		expect(env.get('FIXTURE_IP_V6')).toBe('2001:db8::1');
		expect(env.get('FIXTURE_HASH_SHA256')).toBe('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
		expect(env.get('FIXTURE_HEX')).toBe('deadBEEF');
		expect(env.get('FIXTURE_SEMVER')).toBe('0.2.3-beta');
		expect(env.get('FIXTURE_TIMEZONE')).toBe('America/Chicago');
		expect(env.get('FIXTURE_OPTIONAL')).toBeUndefined();
		expect(env.get('FIXTURE_DEFAULT_INT')).toBe(9);
		expect(env.get('UNDECLARED_KEY')).toBeUndefined();
	});

	describe('presence and defaults', () => {
		it('requires values by default', () => {
			expectSchemaError(
				{ REQUIRED_KEY: Env.schema.string() },
				{ REQUIRED_KEY: undefined },
				'required but not defined',
			);
		});

		it('treats empty strings as missing for required values', () => {
			expectSchemaError(
				{ REQUIRED_KEY: Env.schema.string() },
				{ REQUIRED_KEY: '' },
				'required but not defined',
			);
		});

		it('allows optional values to be missing', () => {
			const env = createEnv(
				{ OPTIONAL_KEY: Env.schema.string({ required: false }) },
				{ OPTIONAL_KEY: undefined },
			);

			expect(env.get('OPTIONAL_KEY')).toBeUndefined();
		});

		it('applies and validates default values', () => {
			const env = createEnv(
				{
					DEFAULT_INT: Env.schema.int({ defaultValue: 7 }),
					DEFAULT_STRING: Env.schema.string({ trim: true, defaultValue: '  value  ' }),
				},
				{
					DEFAULT_INT: undefined,
					DEFAULT_STRING: undefined,
				},
			);

			expect(env.get('DEFAULT_INT')).toBe(7);
			expect(env.get('DEFAULT_STRING')).toBe('value');
		});

		it('rejects invalid default values', () => {
			expect(() => {
				Env.create({
					BROKEN_DEFAULT: Env.schema.int({ defaultValue: 7.5 }),
				});
			}).toThrow('expected integer');
		});
	});

	describe('string rule', () => {
		it('trims before applying pattern and length constraints', () => {
			const env = createEnv(
				{
					RULE_STRING: Env.schema.string({
						trim: true,
						pattern: /^[a-z]+-\d+$/,
						minLength: 7,
						maxLength: 7,
					}),
				},
				{ RULE_STRING: '  abc-123  ' },
			);

			expect(env.get('RULE_STRING')).toBe('abc-123');
		});

		it('rejects values that miss the pattern', () => {
			expectSchemaError(
				{ RULE_STRING: Env.schema.string({ pattern: /^\d+$/ }) },
				{ RULE_STRING: 'abc' },
				'expected pattern',
			);
		});

		it('rejects values shorter than the minimum length', () => {
			expectSchemaError(
				{ RULE_STRING: Env.schema.string({ minLength: 4 }) },
				{ RULE_STRING: 'abc' },
				'minimum of 4',
			);
		});

		it('rejects values longer than the maximum length', () => {
			expectSchemaError(
				{ RULE_STRING: Env.schema.string({ maxLength: 3 }) },
				{ RULE_STRING: 'abcd' },
				'maximum of 3',
			);
		});
	});

	describe('number rules', () => {
		it('parses number, int, and float values', () => {
			const env = createEnv(
				{
					RULE_NUMBER: Env.schema.number({ min: 1, max: 10, range: [3, 4] }),
					RULE_INT: Env.schema.int({ positive: true }),
					RULE_FLOAT: Env.schema.float({ min: 1, max: 2 }),
				},
				{
					RULE_NUMBER: '3.5',
					RULE_INT: '7',
					RULE_FLOAT: '1.25',
				},
			);

			expect(env.get('RULE_NUMBER')).toBe(3.5);
			expect(env.get('RULE_INT')).toBe(7);
			expect(env.get('RULE_FLOAT')).toBe(1.25);
		});

		it('rejects non-integer values for int rules', () => {
			expectSchemaError(
				{ RULE_INT: Env.schema.int() },
				{ RULE_INT: '7.5' },
				'expected integer',
			);
		});

		it('enforces positive and negative constraints', () => {
			expectSchemaError(
				{ RULE_POSITIVE: Env.schema.number({ positive: true }) },
				{ RULE_POSITIVE: '-1' },
				'positive',
			);
			expectSchemaError(
				{ RULE_NEGATIVE: Env.schema.number({ negative: true }) },
				{ RULE_NEGATIVE: '1' },
				'negative',
			);
		});

		it('enforces min, max, and range constraints', () => {
			expectSchemaError(
				{ RULE_NUMBER: Env.schema.number({ min: 5 }) },
				{ RULE_NUMBER: '4' },
				'>= 5',
			);
			expectSchemaError(
				{ RULE_NUMBER: Env.schema.number({ max: 5 }) },
				{ RULE_NUMBER: '6' },
				'<= 5',
			);
			expectSchemaError(
				{ RULE_NUMBER: Env.schema.number({ range: [3, 4] }) },
				{ RULE_NUMBER: '2.9' },
				'within range [3..4]',
			);
		});

		it('rejects blank numeric input', () => {
			expectSchemaError(
				{ RULE_NUMBER: Env.schema.number() },
				{ RULE_NUMBER: '   ' },
				'expected number',
			);
		});

		it('rejects non-finite numbers from environment values and defaults', () => {
			expectSchemaError(
				{ RULE_NUMBER: Env.schema.number() },
				{ RULE_NUMBER: 'Infinity' },
				'expected finite number',
			);
			expect(() => {
				Env.create({
					RULE_FLOAT: Env.schema.float({ defaultValue: -Infinity }),
				});
			}).toThrow('expected finite number');
		});
	});

	describe('boolean rule', () => {
		it('parses common truthy and falsy tokens', () => {
			const env = createEnv(
				{
					RULE_BOOL_TRUE: Env.schema.boolean(),
					RULE_BOOL_FALSE: Env.schema.boolean(),
				},
				{
					RULE_BOOL_TRUE: 'yes',
					RULE_BOOL_FALSE: 'off',
				},
			);

			expect(env.get('RULE_BOOL_TRUE')).toBe(true);
			expect(env.get('RULE_BOOL_FALSE')).toBe(false);
		});

		it('accepts booleans passed through default values', () => {
			const env = Env.create({
				RULE_BOOL: Env.schema.boolean({ defaultValue: true }),
			});

			expect(env.get('RULE_BOOL')).toBe(true);
		});

		it('rejects unknown boolean tokens', () => {
			expectSchemaError(
				{ RULE_BOOL: Env.schema.boolean() },
				{ RULE_BOOL: 'maybe' },
				'expected boolean',
			);
			expectSchemaError(
				{ RULE_BOOL: Env.schema.boolean() },
				{ RULE_BOOL: 'constructor' },
				'expected boolean',
			);
			expectSchemaError(
				{ RULE_BOOL: Env.schema.boolean() },
				{ RULE_BOOL: '__proto__' },
				'expected boolean',
			);
		});
	});

	describe('enum rule', () => {
		it('returns the matched enum member', () => {
			const env = createEnv(
				{ RULE_ENUM: Env.schema.enum(['typescript', 'javascript']) },
				{ RULE_ENUM: 'typescript' },
			);

			expect(env.get('RULE_ENUM')).toBe('typescript');
		});

		it('rejects values outside the enum choices', () => {
			expectSchemaError(
				{ RULE_ENUM: Env.schema.enum(['typescript', 'javascript']) },
				{ RULE_ENUM: 'rust' },
				'expected one of',
			);
		});
	});

	describe('json rule', () => {
		it('parses JSON strings', () => {
			const env = createEnv(
				{ RULE_JSON: Env.schema.json<{ a: number }>() },
				{ RULE_JSON: '{"a":1}' },
			);

			expect(env.get('RULE_JSON')).toEqual({ a: 1 });
		});

		it('supports custom parsers', () => {
			const env = createEnv(
				{
					RULE_JSON_PARSER: Env.schema.json<{ value: number }>({
						parser: (raw) => ({ value: Number(raw) }),
					}),
				},
				{ RULE_JSON_PARSER: '42' },
			);

			expect(env.get('RULE_JSON_PARSER')).toEqual({ value: 42 });
		});

		it('passes through non-string values used as defaults', () => {
			const env = Env.create({
				RULE_JSON: Env.schema.json<{ ok: boolean }>({ defaultValue: { ok: true } }),
			});

			expect(env.get('RULE_JSON')).toEqual({ ok: true });
		});

		it('rejects invalid JSON strings', () => {
			expectSchemaError(
				{ RULE_JSON: Env.schema.json() },
				{ RULE_JSON: '{invalid}' },
				'expected valid JSON',
			);
		});
	});

	describe('array rule', () => {
		it('parses JSON arrays and validates each item', () => {
			const env = createEnv(
				{ RULE_ARRAY: Env.schema.array(Env.schema.int()) },
				{ RULE_ARRAY: '[1,2,3]' },
			);

			expect(env.get('RULE_ARRAY')).toEqual([1, 2, 3]);
		});

		it('treats blank strings as empty arrays', () => {
			const env = createEnv(
				{ RULE_ARRAY: Env.schema.array(Env.schema.string(), { required: false }) },
				{ RULE_ARRAY: '   ' },
			);

			expect(env.get('RULE_ARRAY')).toEqual([]);
		});

		it('rejects non-array JSON payloads', () => {
			expectSchemaError(
				{ RULE_ARRAY: Env.schema.array(Env.schema.string()) },
				{ RULE_ARRAY: '{"a":1}' },
				'expected JSON array',
			);
		});

		it('rejects invalid item types with item paths', () => {
			expectSchemaError(
				{ RULE_ARRAY: Env.schema.array(Env.schema.string()) },
				{ RULE_ARRAY: '["a",1]' },
				/\[RULE_ARRAY\[1\]\] expected string/,
			);
		});
	});

	describe('list rule', () => {
		it('parses delimited strings with configurable trimming', () => {
			const env = createEnv(
				{ RULE_LIST: Env.schema.list(Env.schema.string(), { separator: '|', trim: false }) },
				{ RULE_LIST: 'a| b|c' },
			);

			expect(env.get('RULE_LIST')).toEqual(['a', ' b', 'c']);
		});

		it('supports arrays as direct input', () => {
			const env = Env.create({
				RULE_LIST: Env.schema.list(Env.schema.int(), { defaultValue: [1, 2, 3] }),
			});

			expect(env.get('RULE_LIST')).toEqual([1, 2, 3]);
		});

		it('enforces unique items when requested', () => {
			expectSchemaError(
				{ RULE_LIST: Env.schema.list(Env.schema.string(), { unique: true }) },
				{ RULE_LIST: 'a,a' },
				'unique',
			);
		});

		it('reports item-level validation failures', () => {
			expectSchemaError(
				{ RULE_LIST: Env.schema.list(Env.schema.int()) },
				{ RULE_LIST: '1,two,3' },
				/\[RULE_LIST\[1\]\] expected number/,
			);
		});
	});

	describe('duration rule', () => {
		it('parses unit-based durations', () => {
			const env = createEnv(
				{ RULE_DURATION: Env.schema.duration({ minMs: 1_000, maxMs: 6_000_000 }) },
				{ RULE_DURATION: '1.5h' },
			);

			expect(env.get('RULE_DURATION')).toBe(5_400_000);
		});

		it('supports numeric duration defaults', () => {
			const env = Env.create({
				RULE_DURATION: Env.schema.duration({ defaultValue: 500 }),
			});

			expect(env.get('RULE_DURATION')).toBe(500);
		});

		it('enforces minimum and maximum durations', () => {
			expectSchemaError(
				{ RULE_DURATION: Env.schema.duration({ minMs: 1_000 }) },
				{ RULE_DURATION: '500' },
				'expected duration to be >=',
			);
			expectSchemaError(
				{ RULE_DURATION: Env.schema.duration({ maxMs: 1_000 }) },
				{ RULE_DURATION: '2s' },
				'expected duration to be <=',
			);
		});

		it('rejects unsupported duration formats', () => {
			expectSchemaError(
				{ RULE_DURATION: Env.schema.duration() },
				{ RULE_DURATION: '10d' },
				'expected duration format',
			);
		});
	});

	describe('date rule', () => {
		it('parses ISO dates within bounds', () => {
			const env = createEnv(
				{
					RULE_DATE: Env.schema.date({
						min: '2026-01-01T00:00:00Z',
						max: '2026-12-31T23:59:59Z',
					}),
				},
				{ RULE_DATE: '2026-01-15T12:00:00Z' },
			);

			expect(env.get('RULE_DATE')).toBeInstanceOf(Date);
			expect(env.get('RULE_DATE').toISOString()).toBe('2026-01-15T12:00:00.000Z');
		});

		it('accepts Date objects as default values', () => {
			const value = new Date('2026-01-15T12:00:00Z');
			const env = Env.create({
				RULE_DATE: Env.schema.date({ defaultValue: value }),
			});

			expect(env.get('RULE_DATE')).toBeInstanceOf(Date);
			expect(env.get('RULE_DATE').toISOString()).toBe(value.toISOString());
			expect(env.get('RULE_DATE')).not.toBe(value);
		});

		it('enforces minimum and maximum dates', () => {
			expectSchemaError(
				{ RULE_DATE: Env.schema.date({ min: '2026-02-01T00:00:00Z' }) },
				{ RULE_DATE: '2026-01-15T12:00:00Z' },
				'expected date to be >=',
			);
			expectSchemaError(
				{ RULE_DATE: Env.schema.date({ max: '2026-01-01T00:00:00Z' }) },
				{ RULE_DATE: '2026-01-15T12:00:00Z' },
				'expected date to be <=',
			);
		});

		it('rejects non-ISO date strings', () => {
			expectSchemaError(
				{ RULE_DATE: Env.schema.date() },
				{ RULE_DATE: '01/15/2026' },
				'expected date in ISO format',
			);
		});

		it('rejects invalid calendar dates instead of normalizing them', () => {
			const leapYearEnv = createEnv(
				{ RULE_DATE: Env.schema.date() },
				{ RULE_DATE: '2024-02-29' },
			);
			expect(leapYearEnv.get('RULE_DATE').toISOString()).toBe('2024-02-29T00:00:00.000Z');

			for (const invalidDate of ['2026-02-29', '2026-02-30', '2026-04-31']) {
				expectSchemaError(
					{ RULE_DATE: Env.schema.date() },
					{ RULE_DATE: invalidDate },
					'expected valid date',
				);
			}
		});
	});

	describe('bytes rule', () => {
		it('parses decimal and binary byte units', () => {
			const env = createEnv(
				{ RULE_BYTES: Env.schema.bytes({ min: 1_024 }) },
				{ RULE_BYTES: '1.5GiB' },
			);

			expect(env.get('RULE_BYTES')).toBe(1_610_612_736);
		});

		it('supports numeric byte defaults', () => {
			const env = Env.create({
				RULE_BYTES: Env.schema.bytes({ defaultValue: 2_048 }),
			});

			expect(env.get('RULE_BYTES')).toBe(2_048);
		});

		it('enforces min, max, and non-negative values', () => {
			expectSchemaError(
				{ RULE_BYTES: Env.schema.bytes({ min: 1_024 }) },
				{ RULE_BYTES: '500B' },
				'expected byte size to be >=',
			);
			expectSchemaError(
				{ RULE_BYTES: Env.schema.bytes({ max: 1_024 }) },
				{ RULE_BYTES: '2KiB' },
				'expected byte size to be <=',
			);
			expectSchemaError(
				{ RULE_BYTES: Env.schema.bytes() },
				{ RULE_BYTES: '-1B' },
				'non-negative',
			);
		});

		it('rejects byte sizes that resolve to fractions', () => {
			expectSchemaError(
				{ RULE_BYTES: Env.schema.bytes() },
				{ RULE_BYTES: '0.1B' },
				'whole number',
			);
		});
	});

	describe('path rule', () => {
		it('validates existing files and directories', () => {
			const env = createEnv(
				{
					RULE_FILE: Env.schema.path({ type: 'file', exists: true }),
					RULE_DIR: Env.schema.path({ type: 'dir', exists: true }),
				},
				{
					RULE_FILE: 'package.json',
					RULE_DIR: '.',
				},
			);

			expect(env.get('RULE_FILE')).toBe('package.json');
			expect(env.get('RULE_DIR')).toBe('.');
		});

		it('allows missing paths when existence is not required', () => {
			const env = createEnv(
				{ RULE_PATH: Env.schema.path() },
				{ RULE_PATH: './definitely-missing-file.txt' },
			);

			expect(env.get('RULE_PATH')).toBe('./definitely-missing-file.txt');
		});

		it('trims surrounding whitespace from paths', () => {
			const env = createEnv(
				{ RULE_PATH: Env.schema.path() },
				{ RULE_PATH: '  package.json  ' },
			);

			expect(env.get('RULE_PATH')).toBe('package.json');
		});

		it('rejects empty, missing, or mismatched paths', () => {
			expectSchemaError(
				{ RULE_PATH: Env.schema.path() },
				{ RULE_PATH: '   ' },
				'expected non-empty path',
			);
			expectSchemaError(
				{ RULE_PATH: Env.schema.path({ exists: true }) },
				{ RULE_PATH: './definitely-missing-file.txt' },
				'expected path to exist',
			);
			expectSchemaError(
				{ RULE_PATH: Env.schema.path({ type: 'dir', exists: true }) },
				{ RULE_PATH: 'package.json' },
				'expected path to be a directory',
			);
		});
	});

	describe('base64 rule', () => {
		it('validates standard and URL-safe base64', () => {
			const env = createEnv(
				{
					RULE_BASE64_STD: Env.schema.base64({ padding: 'required' }),
					RULE_BASE64_URL: Env.schema.base64({ urlSafe: true, padding: 'forbidden' }),
				},
				{
					RULE_BASE64_STD: 'SGVsbG8gd29ybGQ=',
					RULE_BASE64_URL: '-w',
				},
			);

			expect(env.get('RULE_BASE64_STD')).toBe('SGVsbG8gd29ybGQ=');
			expect(env.get('RULE_BASE64_URL')).toBe('-w');
		});

		it('allows optional padding by default', () => {
			const env = createEnv(
				{ RULE_BASE64: Env.schema.base64() },
				{ RULE_BASE64: 'SGVsbG8gd29ybGQ' },
			);

			expect(env.get('RULE_BASE64')).toBe('SGVsbG8gd29ybGQ');
		});

		it('rejects padding mode violations and invalid alphabets', () => {
			expectSchemaError(
				{ RULE_BASE64: Env.schema.base64({ padding: 'required' }) },
				{ RULE_BASE64: 'SGVsbG8gd29ybGQ' },
				'expected valid base64',
			);
			expectSchemaError(
				{ RULE_BASE64: Env.schema.base64({ padding: 'forbidden' }) },
				{ RULE_BASE64: 'SGVsbG8gd29ybGQ=' },
				'expected valid base64',
			);
			expectSchemaError(
				{ RULE_BASE64: Env.schema.base64() },
				{ RULE_BASE64: '-w' },
				'expected valid base64',
			);
		});
	});

	describe('secret rule', () => {
		it('redacts stringification while preserving access through release', () => {
			const env = createEnv(
				{ RULE_SECRET: Env.schema.secret() },
				{ RULE_SECRET: 'Se(r3tValu3!' },
			);

			expect(env.get('RULE_SECRET').toString()).toBe('[redacted]');
			expect(String(env.get('RULE_SECRET'))).toBe('[redacted]');
			expect(JSON.stringify({ value: env.get('RULE_SECRET') })).toContain('[redacted]');
			expect(env.get('RULE_SECRET').release()).toBe('Se(r3tValu3!');
		});

		it('does not expose secret storage through inspection or enumeration', () => {
			const env = createEnv(
				{ RULE_SECRET: Env.schema.secret() },
				{ RULE_SECRET: 'Se(r3tValu3!' },
			);
			const secret = env.get('RULE_SECRET');

			expect(inspect(secret)).not.toContain('Se(r3tValu3!');
			expect(Object.keys(secret)).toEqual([]);
			expect({ ...secret }).toEqual({});
		});

		it('accepts string default values and keeps them redacted', () => {
			const env = Env.create({
				RULE_SECRET: Env.schema.secret({ defaultValue: 'default-secret' }),
			});

			expect(inspect(env.get('RULE_SECRET'))).not.toContain('default-secret');
			expect(env.get('RULE_SECRET').release()).toBe('default-secret');
		});

		it('still follows required semantics', () => {
			expectSchemaError(
				{ RULE_SECRET: Env.schema.secret() },
				{ RULE_SECRET: undefined },
				'required but not defined',
			);
		});
	});

	describe('email rule', () => {
		it('accepts valid email addresses', () => {
			const env = createEnv(
				{ RULE_EMAIL: Env.schema.email() },
				{ RULE_EMAIL: 'user@example.com' },
			);

			expect(env.get('RULE_EMAIL')).toBe('user@example.com');
		});

		it('rejects invalid email addresses', () => {
			expectSchemaError(
				{ RULE_EMAIL: Env.schema.email() },
				{ RULE_EMAIL: 'invalid-email' },
				'expected valid email',
			);
		});
	});

	describe('port rule', () => {
		it('parses valid ports', () => {
			const env = createEnv(
				{ RULE_PORT: Env.schema.port() },
				{ RULE_PORT: '3000' },
			);

			expect(env.get('RULE_PORT')).toBe(3000);
		});

		it('accepts the full valid range including zero', () => {
			const env = createEnv(
				{ RULE_PORT: Env.schema.port() },
				{ RULE_PORT: '0' },
			);

			expect(env.get('RULE_PORT')).toBe(0);
		});

		it('rejects invalid ports', () => {
			expectSchemaError(
				{ RULE_PORT: Env.schema.port() },
				{ RULE_PORT: '70000' },
				'expected valid port',
			);
			expectSchemaError(
				{ RULE_PORT: Env.schema.port() },
				{ RULE_PORT: '3.14' },
				'expected valid port',
			);
		});
	});

	describe('url rule', () => {
		it('accepts valid URLs', () => {
			const env = createEnv(
				{ RULE_URL: Env.schema.url() },
				{ RULE_URL: 'https://example.com/path?ok=1' },
			);

			expect(env.get('RULE_URL')).toBe('https://example.com/path?ok=1');
		});

		it('rejects invalid URLs', () => {
			expectSchemaError(
				{ RULE_URL: Env.schema.url() },
				{ RULE_URL: 'notaurl' },
				'expected valid URL',
			);
		});
	});

	describe('host rule', () => {
		it('accepts valid hostnames and localhost', () => {
			const env = createEnv(
				{
					RULE_HOST: Env.schema.host(),
					RULE_LOCALHOST: Env.schema.host(),
				},
				{
					RULE_HOST: 'example.com',
					RULE_LOCALHOST: 'localhost',
				},
			);

			expect(env.get('RULE_HOST')).toBe('example.com');
			expect(env.get('RULE_LOCALHOST')).toBe('localhost');
		});

		it('rejects invalid hostnames', () => {
			expectSchemaError(
				{ RULE_HOST: Env.schema.host() },
				{ RULE_HOST: 'bad host' },
				'expected valid hostname',
			);
		});
	});

	describe('uuid rule', () => {
		it('accepts generic UUIDs and version-specific UUIDs', () => {
			const env = createEnv(
				{
					RULE_UUID_ANY: Env.schema.uuid(),
					RULE_UUID_V4: Env.schema.uuid({ version: UUIDVersion.V4 }),
				},
				{
					RULE_UUID_ANY: '00000000-0000-0000-0000-000000000000',
					RULE_UUID_V4: '217188c7-30e9-4f89-8355-0427832955ea',
				},
			);

			expect(env.get('RULE_UUID_ANY')).toBe('00000000-0000-0000-0000-000000000000');
			expect(env.get('RULE_UUID_V4')).toBe('217188c7-30e9-4f89-8355-0427832955ea');
		});

		it('rejects UUIDs with the wrong version', () => {
			expectSchemaError(
				{ RULE_UUID: Env.schema.uuid({ version: UUIDVersion.V4 }) },
				{ RULE_UUID: '00000000-0000-0000-0000-000000000000' },
				'expected valid UUIDv4',
			);
		});
	});

	describe('ipAddress rule', () => {
		it('accepts IPv4 and IPv6 addresses', () => {
			const env = createEnv(
				{
					RULE_IP_V4: Env.schema.ipAddress({ version: IPVersion.V4 }),
					RULE_IP_V6: Env.schema.ipAddress({ version: IPVersion.V6 }),
					RULE_IP_ANY: Env.schema.ipAddress(),
				},
				{
					RULE_IP_V4: '127.0.0.1',
					RULE_IP_V6: '2001:db8::1',
					RULE_IP_ANY: '127.0.0.1',
				},
			);

			expect(env.get('RULE_IP_V4')).toBe('127.0.0.1');
			expect(env.get('RULE_IP_V6')).toBe('2001:db8::1');
			expect(env.get('RULE_IP_ANY')).toBe('127.0.0.1');
		});

		it('rejects mismatched or invalid IP addresses', () => {
			expectSchemaError(
				{ RULE_IP: Env.schema.ipAddress({ version: IPVersion.V4 }) },
				{ RULE_IP: '2001:db8::1' },
				'valid IPv4',
			);
			expectSchemaError(
				{ RULE_IP: Env.schema.ipAddress() },
				{ RULE_IP: '999.999.999.999' },
				'expected valid IP address',
			);
		});
	});

	describe('hash rule', () => {
		it('accepts hashes with the expected algorithm length', () => {
			const env = createEnv(
				{ RULE_HASH: Env.schema.hash(HashAlgorithm.SHA256) },
				{ RULE_HASH: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' },
			);

			expect(env.get('RULE_HASH')).toBe('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
		});

		it('rejects invalid hash values', () => {
			expectSchemaError(
				{ RULE_HASH: Env.schema.hash(HashAlgorithm.SHA256) },
				{ RULE_HASH: 'abc123' },
				'expected valid SHA256',
			);
			expectSchemaError(
				{ RULE_HASH: Env.schema.hash(HashAlgorithm.SHA256) },
				{ RULE_HASH: 'g123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' },
				'expected hexadecimal string',
			);
		});
	});

	describe('hex rule', () => {
		it('accepts hexadecimal strings', () => {
			const env = createEnv(
				{ RULE_HEX: Env.schema.hex() },
				{ RULE_HEX: 'deadBEEF' },
			);

			expect(env.get('RULE_HEX')).toBe('deadBEEF');
		});

		it('rejects non-hexadecimal strings', () => {
			expectSchemaError(
				{ RULE_HEX: Env.schema.hex() },
				{ RULE_HEX: 'xyz' },
				'expected hexadecimal',
			);
		});
	});

	describe('semver rule', () => {
		it('accepts valid semantic versions', () => {
			const env = createEnv(
				{ RULE_SEMVER: Env.schema.semver() },
				{ RULE_SEMVER: '0.2.3-beta' },
			);

			expect(env.get('RULE_SEMVER')).toBe('0.2.3-beta');
		});

		it('rejects invalid semantic versions', () => {
			expectSchemaError(
				{ RULE_SEMVER: Env.schema.semver() },
				{ RULE_SEMVER: '1.0' },
				'expected SemVer',
			);
		});
	});

	describe('timezone rule', () => {
		it('accepts supported IANA time zones', () => {
			const env = createEnv(
				{
					RULE_TIMEZONE: Env.schema.timezone(),
					RULE_UTC: Env.schema.timezone(),
				},
				{
					RULE_TIMEZONE: 'America/Chicago',
					RULE_UTC: 'UTC',
				},
			);

			expect(env.get('RULE_TIMEZONE')).toBe('America/Chicago');
			expect(env.get('RULE_UTC')).toBe('UTC');
		});

		it('rejects unsupported time zones', () => {
			expectSchemaError(
				{ RULE_TIMEZONE: Env.schema.timezone() },
				{ RULE_TIMEZONE: 'America/Kokomo' },
				'expected supported time zone',
			);
		});
	});
});
