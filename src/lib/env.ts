import * as e from './enums.js';
import * as re from './regex.js';
import { statSync } from 'node:fs';
import { isIP, isIPv4, isIPv6 } from 'node:net';
import type * as t from './types.js';

type RuleWithOptions<R, O> = O extends unknown
	? R & O & ('required' extends keyof O ? unknown : { required?: true })
	: never;

const REDACTED_SECRET = '[redacted]' as const;

function createJSONRule<T = any>(options?: t.JSONOptions<T> & { required?: true }): t.IJSONRule<T> & { required?: true };
function createJSONRule<T = any>(options: t.JSONOptions<T> & { defaultValue: T }): t.IJSONRule<T> & { defaultValue: T };
function createJSONRule<T = any>(options: t.JSONOptions<T> & { required: false }): t.IJSONRule<T> & { required: false };
function createJSONRule<T = any, O extends t.JSONOptions<T> = t.JSONOptions<T>>(options?: O): RuleWithOptions<t.IJSONRule<T>, O>;
function createJSONRule<T>(options?: t.JSONOptions<T>): t.IJSONRule<T> {
	return {
		type: 'json',
		...options,
	};
}

export class SecretValue implements t.ISecretValue {
	readonly #value: string;

	constructor(value: string) {
		this.#value = value;
	}

	public release(): string {
		return this.#value;
	}

	public toString(): typeof REDACTED_SECRET {
		return REDACTED_SECRET;
	}

	public valueOf(): typeof REDACTED_SECRET {
		return REDACTED_SECRET;
	}

	public toJSON(): typeof REDACTED_SECRET {
		return REDACTED_SECRET;
	}

	public [Symbol.toPrimitive](): typeof REDACTED_SECRET {
		return REDACTED_SECRET;
	}
}

export class Env<S extends t.SchemaDefinition = {}> {
	private readonly values = new Map<string, any>();
	private readonly booleanMap = {
		'true': true,
		'1': true,
		'yes': true,
		'y': true,
		'on': true,
		'enabled': true,
		'false': false,
		'0': false,
		'no': false,
		'n': false,
		'off': false,
		'disabled': false,
	} as Record<string, boolean>;
	private readonly algorithmLengthMap = {
		[e.HashAlgorithm.MD5]:    32,
		[e.HashAlgorithm.SHA1]:   40,
		[e.HashAlgorithm.SHA256]: 64,
		[e.HashAlgorithm.SHA384]: 96,
		[e.HashAlgorithm.SHA512]: 128,
	} as const;

	private constructor(schema: S) {
		this.parseAndValidate(schema, process.env);
	}

	public static create<T extends t.SchemaDefinition>(schema: T): Env<T> {
		return new Env<T>(schema);
	}

	public static schema = {
		string: <O extends t.StringOptions = { required?: true }>(options?: O) => ({
			type: 'string',
			...options,
		} as RuleWithOptions<t.IStringRule, O>),
		number: <O extends t.NumberOptions = { required?: true }>(options?: O) => ({
			type: 'number',
			...options,
		} as RuleWithOptions<t.INumberRule, O>),
		int: <O extends t.IntOptions = { required?: true }>(options?: O) => ({
			type: 'int',
			...options,
		} as RuleWithOptions<t.IIntRule, O>),
		float: <O extends t.FloatOptions = { required?: true }>(options?: O) => ({
			type: 'float',
			...options,
		} as RuleWithOptions<t.IFloatRule, O>),
		boolean: <O extends t.BooleanOptions = { required?: true }>(options?: O) => ({
			type: 'boolean',
			...options,
		} as RuleWithOptions<t.IBooleanRule, O>),
		enum: <const T extends readonly any[], O extends t.EnumOptions<T[number]> = { required?: true }>(choices: T, options?: O)=> ({
			type: 'enum',
			choices,
			...options,
		} as RuleWithOptions<t.IEnumRule<T[number]>, O> & { choices: T }),
		json: createJSONRule as typeof createJSONRule,
		array: <R extends t.ValidationRule, O extends t.ArrayOptions<t.InferRuleType<R>> = { required?: true }>(itemType: R, options?: O) => ({
			type: 'array',
			itemType,
			...options,
		} as RuleWithOptions<t.IArrayRule<t.InferRuleType<R>>, O> & { itemType: R }),
		list: <R extends t.ValidationRule, O extends t.ListOptions<t.InferRuleType<R>> = { required?: true }>(itemType: R, options?: O) => ({
			type: 'list',
			itemType,
			...options,
		} as RuleWithOptions<t.IListRule<t.InferRuleType<R>>, O> & { itemType: R }),
		duration: <O extends t.DurationOptions = { required?: true }>(options?: O) => ({
			type: 'duration',
			...options,
		} as RuleWithOptions<t.IDurationRule, O>),
		date: <O extends t.DateOptions = { required?: true }>(options?: O) => ({
			type: 'date',
			...options,
		} as RuleWithOptions<t.IDateRule, O>),
		bytes: <O extends t.BytesOptions = { required?: true }>(options?: O) => ({
			type: 'bytes',
			...options,
		} as RuleWithOptions<t.IBytesRule, O>),
		path: <O extends t.PathOptions = { required?: true }>(options?: O) => {
			const { type: pathType, ...rest } = (options ?? {}) as t.PathOptions;
			return ({ type: 'path', pathType, ...rest } as RuleWithOptions<t.IPathRule, Omit<O, 'type'>>);
		},
		base64: <O extends t.Base64Options = { required?: true }>(options?: O) => ({
			type: 'base64',
			...options,
		} as RuleWithOptions<t.IBase64Rule, O>),
		secret: <O extends t.SecretOptions = { required?: true }>(options?: O) => ({
			type: 'secret',
			...options,
		} as RuleWithOptions<t.ISecretRule, O>),
		email: <O extends t.EmailOptions = { required?: true }>(options?: O) => ({
			type: 'email',
			...options,
		} as RuleWithOptions<t.IEmailRule, O>),
		port: <O extends t.PortOptions = { required?: true }>(options?: O) => ({
			type: 'port',
			...options,
		} as RuleWithOptions<t.IPortRule, O>),
		url: <O extends t.URLOptions = { required?: true }>(options?: O) => ({
			type: 'url',
			...options,
		} as RuleWithOptions<t.IURLRule, O>),
		host: <O extends t.HostOptions = { required?: true }>(options?: O) => ({
			type: 'host',
			...options,
		} as RuleWithOptions<t.IHostRule, O>),
		uuid: <O extends t.UUIDOptions = { required?: true }>(options?: O) => ({
			type: 'uuid',
			...options,
		} as RuleWithOptions<t.IUUIDRule, O>),
		ipAddress: <O extends t.IpAddressOptions = { required?: true }>(options?: O) => ({
			type: 'ipAddress',
			...options,
		} as RuleWithOptions<t.IIpAddressRule, O>),
		hash: <O extends t.HashOptions = { required?: true }>(algorithm: e.HashAlgorithm, options?: O) => ({
			type: 'hash',
			algorithm,
			...options,
		} as RuleWithOptions<t.IHashRule, O>),
		hex: <O extends t.HexadecimalOptions = { required?: true }>(options?: O) => ({
			type: 'hexadecimal',
			...options,
		} as RuleWithOptions<t.IHexadecmialRule, O>),
		semver: <O extends t.SemVerOptions = { required?: true }>(options?: O) => ({
			type: 'semver',
			...options,
		} as RuleWithOptions<t.ISemVerRule, O>),
		timezone: <O extends t.TimeZoneOptions = { required?: true }>(options?: O) => ({
			type: 'timezone',
			...options,
		} as RuleWithOptions<t.ITimeZoneRule, O>),
	};

	public get<K extends keyof S>(key: K): t.InferSchemaType<S>[K];
	public get(key: string): unknown;
	public get(key: string) {
		return this.values.get(key);
	}

	private parseAndValidate(schema: S, envVars: Record<string, string | undefined>) {
		for (const [key, rule] of Object.entries(schema) as [string, t.ValidationRule][]) {
			const raw        = envVars[key];
			const isRequired = rule.required !== false;

			if (raw === undefined || raw === '') {
				if (isRequired && rule.defaultValue === undefined) {
					throw new Error(`Environment variable "${key}" is required but not defined`);
				}

				if (rule.defaultValue !== undefined) {
					const parsedDefaultValue = this.validateValue(rule, rule.defaultValue, key);
					this.values.set(key, parsedDefaultValue);
				}

				continue;
			}

			const parsed = this.validateValue(rule, raw, key);

			this.values.set(key, parsed);
		}
	}

	private validateValue(rule: t.ValidationRule, raw: any, path: string): any {
		switch (rule.type) {
			case 'string': {
				this.assertValueIsString(raw, path);

				if (rule.trim) {
					raw = raw.trim();
				}

				if (rule.pattern && raw.search(rule.pattern) === -1) {
					throw new Error(`[${path}] expected pattern ${rule.pattern}`);
				}

				const min = rule.minLength ?? -Infinity;
				const max = rule.maxLength ?? +Infinity;

				if (raw.length < min) {
					throw new Error(`[${path}] expected string length to be a minimum of ${min} but got ${raw.length}`);
				}

				if (raw.length > max) {
					throw new Error(`[${path}] expected string length to be a maximum of ${max} but got ${raw.length}`);
				}

				return raw;
			}
			case 'number':
			case 'int':
			case 'float': {
				let n: number;
				if (typeof raw === 'number') {
					n = raw;
				} else if (typeof raw === 'string') {
					const trimmed = raw.trim();
					if (trimmed === '') {
						throw new Error(`[${path}] expected number but got "${raw}"`);
					}

					n = Number(trimmed);
				} else {
					throw new Error(`[${path}] expected number but got ${typeof raw}`);
				}

				if (Number.isNaN(n)) {
					throw new Error(`[${path}] expected number but got "${String(raw)}"`);
				}

				if (!Number.isFinite(n)) {
					throw new Error(`[${path}] expected finite number but got "${String(raw)}"`);
				}

				if (rule.type === 'int' && !Number.isInteger(n)) {
					throw new Error(`[${path}] expected integer but got ${raw}`);
				}

				if (rule.positive && n < 0) {
					throw new Error(`[${path}] expected number to be positive`);
				}

				if (rule.negative && n > 0) {
					throw new Error(`[${path}] expected number to be negative`);
				}

				const min = rule.min ?? -Infinity;
				const max = rule.max ?? Infinity;
				if (n < min) {
					throw new Error(`[${path}] expected number to be >= ${min} but got ${n}`);
				}

				if (n > max) {
					throw new Error(`[${path}] expected number to be <= ${max} but got ${n}`);
				}

				if (rule.range) {
					const [rangeMin, rangeMax] = rule.range;
					if (n < rangeMin || n > rangeMax) {
						throw new Error(`[${path}] expected number to be within range [${rangeMin}..${rangeMax}] but got ${n}`);
					}
				}

				return n;
			}
			case 'boolean': {
				if (typeof raw === 'boolean') {
					return raw;
				}

				if (typeof raw === 'string') {
					const s = raw.toLowerCase().trim();
					if (Object.hasOwn(this.booleanMap, s)) {
						return this.booleanMap[s];
					}
				}

				throw new Error(`[${path}] expected boolean but got ${typeof raw}`);
			}
			case 'enum': {
				const choices = rule.choices as readonly any[];
				if (choices.includes(raw)) {
					return raw;
				}

				throw new Error(`[${path}] expected one of [${choices.join(', ')}] but got "${String(raw)}"`);
			}
			case 'json': {
				if (typeof raw === 'string') {
					try {
						const parsed = rule.parser ? rule.parser(raw) : JSON.parse(raw);
						return parsed;
					} catch(err: unknown) {
						throw new Error(`[${path}] expected valid JSON: ${(err as Error).message}`);
					}
				}

				return raw;
			}
			case 'array': {
				const itemRule = rule.itemType as t.ValidationRule;
				let arr: any[];
				if (typeof raw === 'string') {
					const trimmed = raw.trim();
					if (!trimmed) {
						return [];
					}

					if (!trimmed.startsWith('[')) {
						throw new Error(`[${path}] expected JSON array (e.g. '[1,2,3]')`);
					}

					try {
						const parsed = JSON.parse(trimmed);
						if (!Array.isArray(parsed)) {
							throw new Error();
						}

						arr = parsed;
					} catch {
						throw new Error(`[${path}] expected valid JSON array`);
					}
				} else if (Array.isArray(raw)) {
					arr = raw;
				} else {
					throw new Error(`[${path}] expected array but got ${typeof raw}`);
				}

				return arr.map((item, i) => this.validateValue(itemRule, item, `${path}[${i}]`));
			}
			case 'list': {
				const itemRule   = rule.itemType as t.ValidationRule;
				const separator  = rule.separator ?? ',';
				const shouldTrim = rule.trim !== false;

				let items: any[];

				if (typeof raw === 'string') {
					items = raw.split(separator);
					if (shouldTrim) {
						items = items.map((item) => item.trim());
					}
				} else if (Array.isArray(raw)) {
					items = raw;
				} else {
					throw new Error(`[${path}] expected delimited list but got ${typeof raw}`);
				}

				const parsedList = items.map((item, i) => this.validateValue(itemRule, item, `${path}[${i}]`));
				if (rule.unique) {
					const uniqueValues = new Set(parsedList);
					if (uniqueValues.size !== parsedList.length) {
						throw new Error(`[${path}] expected list items to be unique`);
					}
				}

				return parsedList;
			}
			case 'duration': {
				let durationMs: number;
				if (typeof raw === 'number') {
					durationMs = raw;
				} else if (typeof raw === 'string') {
					const trimmed = raw.trim().toLowerCase();
					if (trimmed === '') {
						throw new Error(`[${path}] expected duration but got "${raw}"`);
					}

					const match = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))(ms|s|m|h)?$/);
					if (!match) {
						throw new Error(`[${path}] expected duration format like "500ms", "30s", "5m", or "1h"`);
					}

					const [, valueStr, unit = 'ms'] = match;
					const value = Number(valueStr);
					const multiplierMap = {
						ms: 1,
						s: 1000,
						m: 60_000,
						h: 3_600_000,
					} as const;

					durationMs = value * multiplierMap[unit as keyof typeof multiplierMap];
				} else {
					throw new Error(`[${path}] expected duration but got ${typeof raw}`);
				}

				if (!Number.isFinite(durationMs)) {
					throw new Error(`[${path}] expected finite duration but got "${String(raw)}"`);
				}

				const minMs = rule.minMs ?? -Infinity;
				const maxMs = rule.maxMs ?? +Infinity;
				if (durationMs < minMs) {
					throw new Error(`[${path}] expected duration to be >= ${minMs}ms but got ${durationMs}ms`);
				}

				if (durationMs > maxMs) {
					throw new Error(`[${path}] expected duration to be <= ${maxMs}ms but got ${durationMs}ms`);
				}

				return durationMs;
			}
			case 'date': {
				const parseDateValue = (value: Date | string, label: string): Date => {
					const descriptor = label === 'date' ? 'date' : `${label} date`;

					if (value instanceof Date) {
						if (Number.isNaN(value.getTime())) {
							throw new Error(`[${path}] expected valid ${descriptor}`);
						}

						return new Date(value.getTime());
					}

					if (typeof value !== 'string') {
						throw new Error(`[${path}] expected valid ${descriptor}`);
					}

					const trimmed = value.trim();
					const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(trimmed);
					if (!isoMatch) {
						throw new Error(`[${path}] expected ${descriptor} in ISO format`);
					}

					const [, yearString, monthString, dayString] = isoMatch;
					const year = Number(yearString);
					const month = Number(monthString);
					const day = Number(dayString);
					const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
					const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
					if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
						throw new Error(`[${path}] expected valid ${descriptor}`);
					}

					const parsed = new Date(trimmed);
					if (Number.isNaN(parsed.getTime())) {
						throw new Error(`[${path}] expected valid ${descriptor}`);
					}

					return parsed;
				};

				const parsedDate = parseDateValue(raw, 'date');
				const minDate = rule.min !== undefined ? parseDateValue(rule.min, 'minimum') : undefined;
				const maxDate = rule.max !== undefined ? parseDateValue(rule.max, 'maximum') : undefined;
				if (minDate && parsedDate.getTime() < minDate.getTime()) {
					throw new Error(`[${path}] expected date to be >= ${minDate.toISOString()} but got ${parsedDate.toISOString()}`);
				}

				if (maxDate && parsedDate.getTime() > maxDate.getTime()) {
					throw new Error(`[${path}] expected date to be <= ${maxDate.toISOString()} but got ${parsedDate.toISOString()}`);
				}

				return parsedDate;
			}
			case 'bytes': {
				let bytes: number;
				if (typeof raw === 'number') {
					bytes = raw;
				} else if (typeof raw === 'string') {
					const trimmed = raw.trim().toLowerCase();
					if (trimmed === '') {
						throw new Error(`[${path}] expected bytes but got "${raw}"`);
					}

					const match = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))\s*(b|kb|mb|gb|tb|kib|mib|gib|tib)?$/);
					if (!match) {
						throw new Error(`[${path}] expected byte size format like "256KB", "64MB", or "1GB"`);
					}

					const [, valueStr, unit = 'b'] = match;
					const multiplierMap = {
						b: 1,
						kb: 1_000,
						mb: 1_000_000,
						gb: 1_000_000_000,
						tb: 1_000_000_000_000,
						kib: 1_024,
						mib: 1_048_576,
						gib: 1_073_741_824,
						tib: 1_099_511_627_776,
					} as const;

					const fraction   = valueStr.split('.')[1] ?? '';
					const scale      = 10n ** BigInt(fraction.length);
					const numerator  = BigInt(valueStr.replace('.', ''));
					const multiplier = BigInt(multiplierMap[unit as keyof typeof multiplierMap]);
					const scaled     = numerator * multiplier;
					if (scaled % scale !== 0n) {
						throw new Error(`[${path}] expected byte size to resolve to a whole number`);
					}

					bytes = Number(scaled / scale);
				} else {
					throw new Error(`[${path}] expected bytes but got ${typeof raw}`);
				}

				if (!Number.isFinite(bytes)) {
					throw new Error(`[${path}] expected finite byte size but got "${String(raw)}"`);
				}

				if (!Number.isInteger(bytes)) {
					throw new Error(`[${path}] expected byte size to resolve to a whole number but got ${bytes}`);
				}

				if (bytes < 0) {
					throw new Error(`[${path}] expected byte size to be non-negative`);
				}

				const min = rule.min ?? 0;
				const max = rule.max ?? +Infinity;
				if (bytes < min) {
					throw new Error(`[${path}] expected byte size to be >= ${min} but got ${bytes}`);
				}

				if (bytes > max) {
					throw new Error(`[${path}] expected byte size to be <= ${max} but got ${bytes}`);
				}

				return bytes;
			}
			case 'path': {
				this.assertValueIsString(raw, path);

				const pathValue = raw.trim();
				if (pathValue === '') {
					throw new Error(`[${path}] expected non-empty path`);
				}

				const pathType = rule.pathType ?? 'any';
				if (pathType !== 'any' && pathType !== 'file' && pathType !== 'dir') {
					throw new Error(`[${path}] unsupported path type "${String(pathType)}"`);
				}

				if (pathType === 'any' && !rule.exists) {
					return pathValue;
				}

				let stats: ReturnType<typeof statSync> | undefined;
				try {
					stats = statSync(pathValue, { throwIfNoEntry: false });
				} catch {
					throw new Error(`[${path}] expected path to be readable but got "${pathValue}"`);
				}

				if (!stats) {
					if (rule.exists) {
						throw new Error(`[${path}] expected path to exist but got "${pathValue}"`);
					}

					return pathValue;
				}

				if (pathType === 'file' && !stats.isFile()) {
					throw new Error(`[${path}] expected path to be a file but got "${pathValue}"`);
				}

				if (pathType === 'dir' && !stats.isDirectory()) {
					throw new Error(`[${path}] expected path to be a directory but got "${pathValue}"`);
				}

				return pathValue;
			}
			case 'base64': {
				this.assertValueIsString(raw, path);

				const value = raw.trim();
				if (value === '') {
					throw new Error(`[${path}] expected non-empty base64 string`);
				}

				const urlSafe = rule.urlSafe === true;
				const padding = rule.padding ?? 'optional';
				if (padding !== 'required' && padding !== 'optional' && padding !== 'forbidden') {
					throw new Error(`[${path}] unsupported base64 padding mode "${String(padding)}"`);
				}

				const alphabet = urlSafe ? 'A-Za-z0-9\\-_' : 'A-Za-z0-9+/';
				let pattern: RegExp;
				switch (padding) {
					case 'required':
						pattern = new RegExp(`^(?:[${alphabet}]{4})*(?:[${alphabet}]{2}==|[${alphabet}]{3}=)?$`);
						break;
					case 'forbidden':
						pattern = new RegExp(`^(?:[${alphabet}]{4})*(?:[${alphabet}]{2}|[${alphabet}]{3})?$`);
						break;
					default:
						pattern = new RegExp(`^(?:[${alphabet}]{4})*(?:[${alphabet}]{2}==|[${alphabet}]{3}=|[${alphabet}]{2}|[${alphabet}]{3})?$`);
						break;
				}

				if (!pattern.test(value)) {
					const variant = urlSafe ? 'URL-safe base64' : 'base64';
					throw new Error(`[${path}] expected valid ${variant} string`);
				}

				return value;
			}
			case 'secret': {
				this.assertValueIsString(raw, path);
				return new SecretValue(raw);
			}
			case 'port': {
				let num: number;
				if (typeof raw === 'number') {
					num = raw;
				} else if (typeof raw === 'string') {
					const trimmed = raw.trim();
					if (trimmed === '') {
						throw new Error(`[${path}] expected valid port (0-65535) but got "${String(raw)}"`);
					}

					num = Number(trimmed);
				} else {
					num = NaN;
				}

				if (Number.isNaN(num) || !Number.isInteger(num) || num < 0 || num > 65535) {
					throw new Error(`[${path}] expected valid port (0-65535) but got "${String(raw)}"`);
				}

				return num;
			}
			case 'email': {
				this.assertValueIsString(raw, path);

				if (!re.emailRegex.test(raw)) {
					throw new Error(`[${path}] expected valid email`);
				}

				return raw;
			}
			case 'url': {
				this.assertValueIsString(raw, path);

				try {
					new URL(raw);
					return raw;
				} catch {
					throw new Error(`[${path}] expected valid URL but got "${raw}"`);
				}
			}
			case 'host': {
				this.assertValueIsString(raw, path);

				if (!re.hostRegex.test(raw) && raw !== 'localhost') {
					throw new Error(`[${path}] expected valid hostname but got "${raw}"`);
				}

				return raw;
			}
			case 'uuid': {
				this.assertValueIsString(raw, path);

				const version = rule.version ?? e.UUIDVersion.Any;
				const regex   = version === e.UUIDVersion.V4 ? re.uuid4Regex : re.anyUuidRegex;

				if (!regex.test(raw)) {
					const versionStr = version === e.UUIDVersion.V4 ? 'v4 ' : '';
					throw new Error(`[${path}] expected valid UUID${versionStr} but got "${raw}"`);
				}

				return raw;
			}
			case 'ipAddress': {
				this.assertValueIsString(raw, path);

				const version = rule.version;
				if (version === e.IPVersion.V4 && !isIPv4(raw)) {
					throw new Error(`[${path}] expected be a valid IPv4 address`);
				}

				if (version === e.IPVersion.V6 && !isIPv6(raw)) {
					throw new Error(`[${path}] expected valid IPv6 address`);
				}

				const resolvedVersion = isIP(raw);
				if (resolvedVersion !== 4 && resolvedVersion !== 6) {
					throw new Error(`[${path}] expected valid IP address`);
				}

				return raw;
			}
			case 'hash': {
				this.assertValueIsString(raw, path);

				if (!re.hexadecimalRegex.test(raw)) {
					throw new Error(`[${path}] expected hexadecimal string`);
				}

				const expectedLength = this.algorithmLengthMap[rule.algorithm as e.HashAlgorithm];
				if (expectedLength === undefined) {
					throw new Error(`[${path}] unsupported hash algorithm "${String(rule.algorithm)}"`);
				}

				if (raw.length !== expectedLength) {
					throw new Error(`[${path}] expected valid ${e.HashAlgorithm[rule.algorithm]} string`);
				}

				return raw;
			}
			case 'hexadecimal': {
				this.assertValueIsString(raw, path);

				if (!re.hexadecimalRegex.test(raw)) {
					throw new Error(`[${path}] expected hexadecimal string`);
				}

				return raw;
			}
			case 'semver': {
				this.assertValueIsString(raw, path);

				if (!re.semVerRegex.test(raw)) {
					throw new Error(`[${path}] expected SemVer string`);
				}

				return raw;
			}
			case 'timezone': {
				this.assertValueIsString(raw, path);

				try {
					new Intl.DateTimeFormat('en', { timeZone: raw });
				} catch {
					throw new Error(`[${path}] expected supported time zone but got "${raw}"`);
				}

				return raw;
			}
			default:
				throw new Error(`[${path}] unsupported validation rule ${(rule as any).type}`);
		}
	}

	private assertValueIsString(v: unknown, path: string): asserts v is string {
		if (typeof v !== 'string') {
			throw new Error(`[${path}] expected string but got ${typeof v}`);
		}
	}
}
