import { readFileSync } from 'node:fs';
import { it, expect, describe, beforeEach } from 'vitest';
import { Env, HashAlgorithm, IPVersion, UUIDVersion } from '../src/index.ts';

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

const expectSchemaError = (
	schema: Record<string, unknown>,
	values: Record<string, string | undefined>,
	message: string | RegExp,
): void => {
	setEnv(values);
	expect(() => Env.create(schema as never)).toThrow(message);
};

describe('Env schema validation', () => {
	beforeEach(() => {
		restoreEnv();
	});

	it('parses the .env fixture with a comprehensive schema', () => {
		const fixtureEnv = loadFixtureEnv();
		setEnv({
			...fixtureEnv,
			FIXTURE_OPTIONAL: undefined,
			FIXTURE_DEFAULT_INT: undefined,
		});

		const env = Env.create({
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
			FIXTURE_SECRET: Env.schema.secret({ minLength: 12, minClasses: 3 }),
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
			FIXTURE_OPTIONAL: Env.schema.string({ required: false }),
			FIXTURE_DEFAULT_INT: Env.schema.int({ defaultValue: 9 }),
		});

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
		expect(env.get('FIXTURE_SECRET')).toBe('Str0ngSecret1!');
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
		expect(env.get('FIXTURE_OPTIONAL')).toBeUndefined();
		expect(env.get('FIXTURE_DEFAULT_INT')).toBe(9);
		expect(env.get('UNDECLARED_KEY')).toBeUndefined();
	});

	it('enforces required values and supports optional/default values', () => {
		expectSchemaError(
			{ REQUIRED_KEY: Env.schema.string() },
			{ REQUIRED_KEY: undefined },
			'required but not defined',
		);

		setEnv({
			OPTIONAL_KEY: undefined,
			DEFAULT_KEY: undefined,
		});
		const env = Env.create({
			OPTIONAL_KEY: Env.schema.string({ required: false }),
			DEFAULT_KEY: Env.schema.int({ defaultValue: 7 }),
		});

		expect(env.get('OPTIONAL_KEY')).toBeUndefined();
		expect(env.get('DEFAULT_KEY')).toBe(7);
	});

	it('validates string options', () => {
		setEnv({ RULE_STRING: '  abc-123  ' });
		const env = Env.create({
			RULE_STRING: Env.schema.string({
				trim: true,
				pattern: /^[a-z]+-\d+$/,
				minLength: 7,
				maxLength: 7,
			}),
		});

		expect(env.get('RULE_STRING')).toBe('abc-123');

		expectSchemaError(
			{ RULE_STRING: Env.schema.string({ pattern: /^\d+$/ }) },
			{ RULE_STRING: 'abc' },
			'expected pattern',
		);
	});

	it('validates number/int/float options', () => {
		setEnv({
			RULE_NUMBER: '3.5',
			RULE_INT: '7',
			RULE_FLOAT: '1.25',
		});
		const env = Env.create({
			RULE_NUMBER: Env.schema.number({ min: 1, max: 10, range: [3, 4] }),
			RULE_INT: Env.schema.int({ positive: true }),
			RULE_FLOAT: Env.schema.float({ min: 1, max: 2 }),
		});

		expect(env.get('RULE_NUMBER')).toBe(3.5);
		expect(env.get('RULE_INT')).toBe(7);
		expect(env.get('RULE_FLOAT')).toBe(1.25);

		expectSchemaError(
			{ RULE_INT: Env.schema.int() },
			{ RULE_INT: '7.5' },
			'expected integer',
		);
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
		expectSchemaError(
			{ RULE_NUMBER: Env.schema.number() },
			{ RULE_NUMBER: '   ' },
			'expected number',
		);
	});

	it('validates boolean and enum rules', () => {
		setEnv({
			RULE_BOOL_TRUE: 'yes',
			RULE_BOOL_FALSE: 'off',
			RULE_ENUM: 'typescript',
		});
		const env = Env.create({
			RULE_BOOL_TRUE: Env.schema.boolean(),
			RULE_BOOL_FALSE: Env.schema.boolean(),
			RULE_ENUM: Env.schema.enum(['typescript', 'javascript']),
		});

		expect(env.get('RULE_BOOL_TRUE')).toBe(true);
		expect(env.get('RULE_BOOL_FALSE')).toBe(false);
		expect(env.get('RULE_ENUM')).toBe('typescript');

		expectSchemaError(
			{ RULE_BOOL: Env.schema.boolean() },
			{ RULE_BOOL: 'maybe' },
			'expected boolean',
		);
		expectSchemaError(
			{ RULE_ENUM: Env.schema.enum(['typescript', 'javascript']) },
			{ RULE_ENUM: 'rust' },
			'expected one of',
		);
	});

	it('validates json and array rules', () => {
		setEnv({
			RULE_JSON: '{"a":1}',
			RULE_ARRAY: '[1,2,3]',
		});
		const env = Env.create({
			RULE_JSON: Env.schema.json<{ a: number }>(),
			RULE_ARRAY: Env.schema.array(Env.schema.int()),
		});

		expect(env.get('RULE_JSON')).toEqual({ a: 1 });
		expect(env.get('RULE_ARRAY')).toEqual([1, 2, 3]);

		setEnv({ RULE_JSON_PARSER: '42' });
		const parserEnv = Env.create({
			RULE_JSON_PARSER: Env.schema.json<{ value: number }>({
				parser: (raw) => ({ value: Number(raw) }),
			}),
		});
		expect(parserEnv.get('RULE_JSON_PARSER')).toEqual({ value: 42 });

		expectSchemaError(
			{ RULE_ARRAY: Env.schema.array(Env.schema.string()) },
			{ RULE_ARRAY: '["a",1]' },
			'expected string',
		);
		expectSchemaError(
			{ RULE_JSON: Env.schema.json() },
			{ RULE_JSON: '{invalid}' },
			'expected valid JSON',
		);
	});

	it('validates list options', () => {
		setEnv({ RULE_LIST: 'a| b|c' });
		const env = Env.create({
			RULE_LIST: Env.schema.list(Env.schema.string(), { separator: '|', trim: false }),
		});
		expect(env.get('RULE_LIST')).toEqual(['a', ' b', 'c']);

		expectSchemaError(
			{ RULE_LIST: Env.schema.list(Env.schema.string(), { unique: true }) },
			{ RULE_LIST: 'a,a' },
			'unique',
		);
	});

	it('validates duration options', () => {
		setEnv({ RULE_DURATION: '1.5h' });
		const env = Env.create({
			RULE_DURATION: Env.schema.duration({ minMs: 1_000, maxMs: 6_000_000 }),
		});
		expect(env.get('RULE_DURATION')).toBe(5_400_000);

		expectSchemaError(
			{ RULE_DURATION: Env.schema.duration({ minMs: 1_000 }) },
			{ RULE_DURATION: '500' },
			'expected duration to be >=',
		);
		expectSchemaError(
			{ RULE_DURATION: Env.schema.duration() },
			{ RULE_DURATION: '10d' },
			'expected duration format',
		);
	});

	it('validates date options', () => {
		setEnv({ RULE_DATE: '2026-01-15T12:00:00Z' });
		const env = Env.create({
			RULE_DATE: Env.schema.date({
				min: '2026-01-01T00:00:00Z',
				max: '2026-12-31T23:59:59Z',
			}),
		});
		expect(env.get('RULE_DATE')).toBeInstanceOf(Date);
		expect(env.get('RULE_DATE').toISOString()).toBe('2026-01-15T12:00:00.000Z');

		expectSchemaError(
			{ RULE_DATE: Env.schema.date({ min: '2026-02-01T00:00:00Z' }) },
			{ RULE_DATE: '2026-01-15T12:00:00Z' },
			'expected date to be >=',
		);
		expectSchemaError(
			{ RULE_DATE: Env.schema.date() },
			{ RULE_DATE: '01/15/2026' },
			'expected date in ISO format',
		);
	});

	it('validates bytes options', () => {
		setEnv({ RULE_BYTES: '1.5GiB' });
		const env = Env.create({
			RULE_BYTES: Env.schema.bytes({ min: 1_024 }),
		});
		expect(env.get('RULE_BYTES')).toBe(1_610_612_736);

		expectSchemaError(
			{ RULE_BYTES: Env.schema.bytes({ min: 1_024 }) },
			{ RULE_BYTES: '500B' },
			'expected byte size to be >=',
		);
		expectSchemaError(
			{ RULE_BYTES: Env.schema.bytes() },
			{ RULE_BYTES: '0.1B' },
			'whole number',
		);
	});

	it('validates path options', () => {
		setEnv({
			RULE_FILE: 'package.json',
			RULE_DIR: '.',
		});
		const env = Env.create({
			RULE_FILE: Env.schema.path({ type: 'file', exists: true }),
			RULE_DIR: Env.schema.path({ type: 'dir', exists: true }),
		});

		expect(env.get('RULE_FILE')).toBe('package.json');
		expect(env.get('RULE_DIR')).toBe('.');

		setEnv({ RULE_MISSING: './definitely-missing-file.txt' });
		const missingAllowed = Env.create({
			RULE_MISSING: Env.schema.path(),
		});
		expect(missingAllowed.get('RULE_MISSING')).toBe('./definitely-missing-file.txt');

		expectSchemaError(
			{ RULE_PATH: Env.schema.path({ type: 'dir', exists: true }) },
			{ RULE_PATH: 'package.json' },
			'expected path to be a directory',
		);
		expectSchemaError(
			{ RULE_PATH: Env.schema.path({ exists: true }) },
			{ RULE_PATH: './definitely-missing-file.txt' },
			'expected path to exist',
		);
	});

	it('validates base64 options', () => {
		setEnv({
			RULE_BASE64_STD: 'SGVsbG8gd29ybGQ=',
			RULE_BASE64_URL: '-w',
		});
		const env = Env.create({
			RULE_BASE64_STD: Env.schema.base64({ padding: 'required' }),
			RULE_BASE64_URL: Env.schema.base64({ urlSafe: true, padding: 'forbidden' }),
		});

		expect(env.get('RULE_BASE64_STD')).toBe('SGVsbG8gd29ybGQ=');
		expect(env.get('RULE_BASE64_URL')).toBe('-w');

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

	it('validates secret options', () => {
		setEnv({ RULE_SECRET: 'Str0ngSecret1!' });
		const env = Env.create({
			RULE_SECRET: Env.schema.secret({ minLength: 12, minClasses: 3 }),
		});
		expect(env.get('RULE_SECRET')).toBe('Str0ngSecret1!');

		expectSchemaError(
			{ RULE_SECRET: Env.schema.secret({ minLength: 12, minClasses: 3 }) },
			{ RULE_SECRET: 'weakpassword' },
			'at least 3 character classes',
		);
		expectSchemaError(
			{ RULE_SECRET: Env.schema.secret({ maxLength: 8 }) },
			{ RULE_SECRET: 'Str0ngSecret1!' },
			'expected secret length to be <= 8',
		);
	});

	it('validates email, port, url, and host rules', () => {
		setEnv({
			RULE_EMAIL: 'user@example.com',
			RULE_PORT: '3000',
			RULE_URL: 'https://example.com/path?ok=1',
			RULE_HOST: 'example.com',
		});
		const env = Env.create({
			RULE_EMAIL: Env.schema.email(),
			RULE_PORT: Env.schema.port(),
			RULE_URL: Env.schema.url(),
			RULE_HOST: Env.schema.host(),
		});

		expect(env.get('RULE_EMAIL')).toBe('user@example.com');
		expect(env.get('RULE_PORT')).toBe(3000);
		expect(env.get('RULE_URL')).toBe('https://example.com/path?ok=1');
		expect(env.get('RULE_HOST')).toBe('example.com');

		expectSchemaError(
			{ RULE_EMAIL: Env.schema.email() },
			{ RULE_EMAIL: 'invalid-email' },
			'expected valid email',
		);
		expectSchemaError(
			{ RULE_PORT: Env.schema.port() },
			{ RULE_PORT: '70000' },
			'expected valid port',
		);
		expectSchemaError(
			{ RULE_URL: Env.schema.url() },
			{ RULE_URL: 'notaurl' },
			'expected valid URL',
		);
		expectSchemaError(
			{ RULE_HOST: Env.schema.host() },
			{ RULE_HOST: 'bad host' },
			'expected valid hostname',
		);
	});

	it('validates uuid, ip, hash, and hex rules', () => {
		setEnv({
			RULE_UUID_ANY: '00000000-0000-0000-0000-000000000000',
			RULE_UUID_V4: '217188c7-30e9-4f89-8355-0427832955ea',
			RULE_IP_V4: '127.0.0.1',
			RULE_IP_V6: '2001:db8::1',
			RULE_HASH: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
			RULE_HEX: 'deadBEEF',
		});
		const env = Env.create({
			RULE_UUID_ANY: Env.schema.uuid(),
			RULE_UUID_V4: Env.schema.uuid({ version: UUIDVersion.V4 }),
			RULE_IP_V4: Env.schema.ipAddress({ version: IPVersion.V4 }),
			RULE_IP_V6: Env.schema.ipAddress({ version: IPVersion.V6 }),
			RULE_HASH: Env.schema.hash(HashAlgorithm.SHA256),
			RULE_HEX: Env.schema.hex(),
		});

		expect(env.get('RULE_UUID_ANY')).toBe('00000000-0000-0000-0000-000000000000');
		expect(env.get('RULE_UUID_V4')).toBe('217188c7-30e9-4f89-8355-0427832955ea');
		expect(env.get('RULE_IP_V4')).toBe('127.0.0.1');
		expect(env.get('RULE_IP_V6')).toBe('2001:db8::1');
		expect(env.get('RULE_HASH')).toBe('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
		expect(env.get('RULE_HEX')).toBe('deadBEEF');

		expectSchemaError(
			{ RULE_UUID: Env.schema.uuid({ version: UUIDVersion.V4 }) },
			{ RULE_UUID: '00000000-0000-0000-0000-000000000000' },
			'expected valid UUIDv4',
		);
		expectSchemaError(
			{ RULE_IP: Env.schema.ipAddress({ version: IPVersion.V4 }) },
			{ RULE_IP: '2001:db8::1' },
			'valid IPv4',
		);
		expectSchemaError(
			{ RULE_HASH: Env.schema.hash(HashAlgorithm.SHA256) },
			{ RULE_HASH: 'abc123' },
			'expected valid SHA256',
		);
		expectSchemaError(
			{ RULE_HEX: Env.schema.hex() },
			{ RULE_HEX: 'xyz' },
			'expected hexadecimal',
		);
	});
});
