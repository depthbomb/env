if (!process.versions.bun) {
	throw new Error('@depthbomb/env is made for the Bun runtime. Because this library is inspired by @adonisjs/env, it is recommended to use that for non-Bun runtimes.');
}

import { isIP, isIPv4, isIPv6 } from 'node:net';
import { hostRegex, emailRegex, anyUuidRegex, uuid4Regex } from './regex.js';
import type * as t from './types.js';

export class Env<S extends t.SchemaDefinition = {}> {
	private readonly schema: S;
	private readonly values     = new Map<string, any>();
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

	private constructor(schema: S) {
		this.schema = schema;
		this.parseAndValidate(process.env);
	}

	public static create<T extends t.SchemaDefinition>(schema: T): Env<T> {
		return new Env<T>(schema);
	}

	public static schema = {
		string(options?: t.StringOptions): t.IStringRule {
			return { type: 'string', ...options };
		},
		number(options?: t.NumberOptions): t.INumberRule {
			return { type: 'number', ...options };
		},
		int(options?: t.IntOptions): t.IIntRule {
			return { type: 'int', ...options };
		},
		float(options?: t.FloatOptions): t.IFloatRule {
			return { type: 'float', ...options };
		},
		boolean(options?: t.BooleanOptions): t.IBooleanRule {
			return { type: 'boolean', ...options };
		},
		enum<const T extends readonly any[]>(choices: T, options?: t.EnumOptions<T[number]>): t.IEnumRule<T[number]> {
			return { type: 'enum', choices, ...options };
		},
		json<T = any>(options?: t.JSONOptions<T>): t.IJSONRule<T> {
			return { type: 'json', ...options };
		},
		array<T = any>(itemType: t.ValidationRule<T>, options?: t.ArrayOptions<T>): t.IArrayRule<T> {
			return { type: 'array', itemType, ...options };
		},
		email(options?: t.EmailOptions): t.IEmailRule {
			return { type: 'email', ...options };
		},
		port(options?: t.PortOptions): t.IPortRule {
			return { type: 'port', ...options };
		},
		url(options?: t.URLOptions): t.IURLRule {
			return { type: 'url', ...options };
		},
		host(options?: t.HostOptions): t.IHostRule {
			return { type: 'host', ...options };
		},
		uuid(options?: t.UuidOptions): t.IUuidRule {
			return { type: 'uuid', version: 'any', ...options };
		},
		ipAddress(options?: t.IpAddressOptions): t.IIpAddressRule {
			return { type: 'ipAddress', ...options };
		},
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
					this.values.set(key, rule.defaultValue);
				}

				continue;
			}

			const parsed = this.validateValue(rule, raw, key);

			this.values.set(key, parsed);
		}

		for (const [k, v] of Object.entries(envVars)) {
			if (!this.values.has(k) && v !== undefined) {
				this.values.set(k, v);
			}
		}
	}

	private validateValue(rule: t.ValidationRule, raw: any, path: string): any {
		switch (rule.type) {
			case 'string': {
				this.assertValueIsString(raw, path);

				if (rule.trim) {
					raw = raw.trim();
				}

				if (rule.pattern && !rule.pattern.exec(raw)) {
					throw new Error(`[${path}] expected pattern ${rule.pattern}`);
				}

				const min = rule.minLength ?? -Infinity;
				const max = rule.maxLength ?? +Infinity;

				if (raw.length < min) {
					throw new Error(`[${path}] expected string length to be a minimum of ${rule.minLength} but got ${raw.length}`);
				}

				if (raw.length > max) {
					throw new Error(`[${path}] expected string length to be a maximum of ${rule.maxLength} but got ${raw.length}`);
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
					n = Number(raw);
					if (Number.isNaN(n)) {
						throw new Error(`[${path}] expected number but got ${raw}`);
					}
				} else {
					throw new Error(`[${path}] expected number but got ${typeof raw}`);
				}

				if (rule.type === 'int' && !Number.isInteger(n)) {
					if (typeof raw === 'number') {
						throw new Error(`[${path}] expected integer but got float`);
					} else {
						throw new Error(`[${path}] expected integer but got float ${raw}`);
					}
				}

				const min = rule.min ?? -Infinity;
				const max = rule.max ?? Infinity;

				if (n < min) {
					throw new Error(`[${path}] expected number to be >= ${rule.min} but got ${n}`);
				}

				if (n > max) {
					throw new Error(`[${path}] expected number to be <= ${rule.max} but got ${n}`);
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

				if (typeof raw === 'string' && choices.includes(raw)) {
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
			case 'port': {
				const num = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN);
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

				const version = rule.version || 'any';
				const regex   = version === 'v4' ? uuid4Regex : anyUuidRegex;

				if (!regex.test(raw)) {
					const versionStr = version === 'v4' ? 'v4 ' : '';
					throw new Error(`[${path}] expected valid UUID${versionStr} but got "${raw}"`);
				}

				return raw;
			}
			case 'ipAddress': {
				this.assertValueIsString(raw, path);

				const version = rule.version;
				if (version === 'ipv4' && !isIPv4(raw)) {
					throw new Error(`[${path}] expected be a valid IPv4 address`);
				}

				if (version === 'ipv6' && !isIPv6(raw)) {
					throw new Error(`[${path}] expected valid IPv6 address`);
				}

				const resolvedVersion = isIP(raw);
				if (resolvedVersion !== 4 && resolvedVersion !== 6) {
					throw new Error(`[${path}] expected valid IP address`);
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
