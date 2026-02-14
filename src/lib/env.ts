import * as e from './enums.js';
import { isIP, isIPv4, isIPv6 } from 'node:net';
import { hostRegex, emailRegex, uuid4Regex, anyUuidRegex, hexadecimalRegex } from './regex.js';
import type * as t from './types.js';

export class Env<S extends t.SchemaDefinition = {}> {
	private readonly schema: S;
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
		this.schema = schema;
		this.parseAndValidate(process.env);
	}

	public static create<T extends t.SchemaDefinition>(schema: T): Env<T> {
		return new Env<T>(schema);
	}

	public static schema = {
		string: <O extends t.StringOptions>(options?: O) => ({ type: 'string', ...options } as t.IStringRule & O),
		number: <O extends t.NumberOptions>(options?: O) => ({ type: 'number', ...options } as t.INumberRule & O),
		int: <O extends t.IntOptions>(options?: O) => ({ type: 'int', ...options } as t.IIntRule & O),
		float: <O extends t.FloatOptions>(options?: O) => ({ type: 'float', ...options } as t.IFloatRule & O),
		boolean: <O extends t.BooleanOptions>(options?: O) => ({ type: 'boolean', ...options } as t.IBooleanRule & O),
		enum: <const T extends readonly any[], O extends t.EnumOptions<T[number]>>(choices: T, options?: O)=> ({ type: 'enum', choices, ...options } as t.IEnumRule<T[number]> & O & { choices: T }),
		json: <T = any, O extends t.JSONOptions<T> = t.JSONOptions<T>>(options?: O) => ({ type: 'json', ...options } as t.IJSONRule<T> & O),
		array: <R extends t.ValidationRule, O extends t.ArrayOptions<t.InferRuleType<R>> = t.ArrayOptions<t.InferRuleType<R>>>(itemType: R, options?: O) => ({ type: 'array', itemType, ...options } as t.IArrayRule<t.InferRuleType<R>> & O & { itemType: R }),
		list: <R extends t.ValidationRule, O extends t.ListOptions<t.InferRuleType<R>> = t.ListOptions<t.InferRuleType<R>>>(itemType: R, options?: O) => ({ type: 'list', itemType, ...options } as t.IListRule<t.InferRuleType<R>> & O & { itemType: R }),
		email: <O extends t.EmailOptions>(options?: O) => ({ type: 'email', ...options } as t.IEmailRule & O),
		port: <O extends t.PortOptions>(options?: O) => ({ type: 'port', ...options } as t.IPortRule & O),
		url: <O extends t.URLOptions>(options?: O) => ({ type: 'url', ...options } as t.IURLRule & O),
		host: <O extends t.HostOptions>(options?: O) => ({ type: 'host', ...options } as t.IHostRule & O),
		uuid: <O extends t.UUIDOptions>(options?: O) => ({ type: 'uuid', ...options } as t.IUUIDRule & O),
		ipAddress: <O extends t.IpAddressOptions>(options?: O) => ({ type: 'ipAddress', ...options } as t.IIpAddressRule & O),
		hash: <O extends t.HashOptions>(algorithm: e.HashAlgorithm, options?: O) => ({ type: 'hash', algorithm, ...options } as t.IHashRule & O),
		hex: <O extends t.HexadecimalOptions>(options?: O) => ({ type: 'hexadecimal', ...options } as t.IHexadecmialRule & O),
	};

	public get<K extends keyof S>(key: K): t.InferSchemaType<S>[K];
	public get(key: string): t.Maybe<string>;
	public get(key: string) {
		return this.values.get(key);
	}

	private parseAndValidate(envVars: Record<string, t.Maybe<string>>) {
		for (const [key, rule] of Object.entries(this.schema) as [string, t.ValidationRule][]) {
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
					if (Number.isNaN(n)) {
						throw new Error(`[${path}] expected number but got "${raw}"`);
					}
				} else {
					throw new Error(`[${path}] expected number but got ${typeof raw}`);
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
					if (s in this.booleanMap) {
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

				if (!emailRegex.test(raw)) {
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

				if (!hostRegex.test(raw) && raw !== 'localhost') {
					throw new Error(`[${path}] expected valid hostname but got "${raw}"`);
				}

				return raw;
			}
			case 'uuid': {
				this.assertValueIsString(raw, path);

				const version = rule.version ?? e.UUIDVersion.Any;
				const regex   = version === e.UUIDVersion.V4 ? uuid4Regex : anyUuidRegex;

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

				if (!hexadecimalRegex.test(raw)) {
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

				if (!hexadecimalRegex.test(raw)) {
					throw new Error(`[${path}] expected hexadecimal string`);
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
