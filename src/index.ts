if (!process.versions.bun) {
	throw new Error('@depthbomb/env is made for the Bun runtime. Because this library is inspired by @adonisjs/env, it is recommended to use that for non-Bun runtimes.');
}

import { hostRegex, emailRegex, anyUuidRegex, uuid4Regex } from './regex.js';
import type {
	Maybe,
	UUIDVersion,
	StringFormat,
	SchemaOptions,
	ValidationRule,
	InferSchemaType,
	SchemaDefinition,
} from './types.js';

export class Env<S extends SchemaDefinition = {}> {
	private values = new Map<string, any>();
	private schema: S;

	private constructor(schema: S) {
		this.schema = schema;
		this.parseAndValidate(process.env);
	}

	public static create<T extends SchemaDefinition>(schema: T): Env<T> {
		return new Env<T>(schema);
	}

	public static schema = {
		string(options?: SchemaOptions & { format?: StringFormat; defaultValue?: string }) {
			return {
				type: 'string',
				required: options?.required,
				format: options?.format,
				defaultValue: options?.defaultValue,
			} as ValidationRule<string>;
		},
		number(options?: SchemaOptions & { defaultValue?: number }) {
			return {
				type: 'number',
				required: options?.required,
				defaultValue: options?.defaultValue,
			} as ValidationRule<number>;
		},
		int(options?: SchemaOptions & { defaultValue?: number }) {
			return {
				type: 'int',
				required: options?.required,
				defaultValue: options?.defaultValue,
			} as ValidationRule<number>;
		},
		float(options?: SchemaOptions & { defaultValue?: number }) {
			return {
				type: 'float',
				required: options?.required,
				defaultValue: options?.defaultValue,
			} as ValidationRule<number>;
		},
		boolean(options?: SchemaOptions & { defaultValue?: boolean }) {
			return {
				type: 'boolean',
				required: options?.required,
				defaultValue: options?.defaultValue,
			} as ValidationRule<boolean>;
		},
		enum<T extends readonly any[]>(choices: T, options?: SchemaOptions & { defaultValue?: T[number] }) {
			return {
				type: 'enum',
				choices,
				required: options?.required,
				defaultValue: options?.defaultValue,
			} as ValidationRule<T[number]>;
		},
		json<T = any>(options?: SchemaOptions & { parser?: (raw: string) => T; defaultValue?: T }) {
			return {
				type: 'json',
				required: options?.required,
				parser: options?.parser,
				defaultValue: options?.defaultValue,
			} as ValidationRule<T>;
		},
		array<T = any>(item: ValidationRule<T>, options?: SchemaOptions & { defaultValue?: T[] }) {
			return {
				type: 'array',
				itemType: item,
				required: options?.required,
				defaultValue: options?.defaultValue,
			} as ValidationRule<T[]>;
		},
		port(options?: SchemaOptions & { defaultValue?: number }) {
			return {
				type: 'port',
				required: options?.required,
				defaultValue: options?.defaultValue,
			} as ValidationRule<number>;
		},
		url(options?: SchemaOptions & { defaultValue?: string }) {
			return {
				type: 'url',
				required: options?.required,
				defaultValue: options?.defaultValue,
			} as ValidationRule<string>;
		},
		host(options?: SchemaOptions & { defaultValue?: string }) {
			return {
				type: 'host',
				required: options?.required,
				defaultValue: options?.defaultValue,
			} as ValidationRule<string>;
		},
		uuid(options?: SchemaOptions & { version?: UUIDVersion; defaultValue?: string }) {
			return {
				type: 'uuid',
				required: options?.required,
				version: options?.version || 'any',
				defaultValue: options?.defaultValue,
			} as ValidationRule<string>;
		},
	};

	public get<K extends keyof S>(key: K): InferSchemaType<S>[K];
	public get(key: string): Maybe<string>;
	public get(key: string) {
		return this.values.get(key);
	}

	private parseAndValidate(envVars: Record<string, Maybe<string>>) {
		for (const [key, rule] of Object.entries(this.schema) as [string, ValidationRule][]) {
			const raw        = envVars[key];
			const isRequired = (rule as any).required !== false;

			if (raw === undefined || raw === '') {
				if (isRequired && (rule as any).defaultValue === undefined) {
					throw new Error(`Environment variable "${key}" is required but not defined`);
				}

				if ((rule as any).defaultValue !== undefined) {
					this.values.set(key, (rule as any).defaultValue);
				}

				continue;
			}

			const parsed = this.validateValue(rule, raw, key);
			if ((rule as any).validate && !(rule as any).validate(parsed)) {
				throw new Error(`Environment variable "${key}" failed custom validation`);
			}

			this.values.set(key, parsed);
		}

		for (const [k, v] of Object.entries(envVars)) {
			if (!this.values.has(k) && v !== undefined) {
				this.values.set(k, v);
			}
		}
	}
	private validateValue(rule: ValidationRule, raw: any, path: string): any {
		switch (rule.type) {
			case 'string': {
				if (typeof raw === 'string') {
					if (rule.format) {
						this.validateFormat(path, raw, rule.format);
					}

					return raw;
				}

				throw new Error(`[${path}] expected string but got ${typeof raw}`);
			}
			case 'number':
			case 'int':
			case 'float': {
				if (typeof raw === 'number') {
					if (rule.type === 'int' && !Number.isInteger(raw)) {
						throw new Error(`[${path}] expected integer but got float`);
					}

					return raw;
				}
				if (typeof raw === 'string') {
					const n = Number(raw);
					if (Number.isNaN(n)) {
						throw new Error(`[${path}] expected number but got "${raw}"`);
					}

					if (rule.type === 'int' && !Number.isInteger(n)) {
						throw new Error(`[${path}] expected integer but got float "${raw}"`);
					}

					return n;
				}

				throw new Error(`[${path}] expected number but got ${typeof raw}`);
			}
			case 'boolean': {
				if (typeof raw === 'boolean') {
					return raw;
				}

				if (typeof raw === 'string') {
					const s = raw.toLowerCase();
					if (s === 'true' || s === '1' || s === 'yes' || s === 'y') {
						return true;
					}

					if (s === 'false' || s === '0' || s === 'no' || s === 'n') {
						return false;
					}

					throw new Error(`[${path}] expected boolean but got "${raw}"`);
				}
				throw new Error(`[${path}] expected boolean but got ${typeof raw}`);
			}
			case 'enum': {
				const choices = (rule as any).choices as readonly any[];
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
						const parsed = (rule as any).parser ? (rule as any).parser(raw) : JSON.parse(raw);
						return parsed;
					} catch {
						throw new Error(`[${path}] expected valid JSON`);
					}
				}

				return raw;
			}
			case 'array': {
				const itemRule = (rule as any).itemType as ValidationRule;
				let arr: any[];
				if (typeof raw === 'string') {
					const trimmed = raw.trim();
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
				if (Number.isNaN(num) || !Number.isInteger(num) || num <= 0 || num > 65535) {
					throw new Error(`[${path}] expected valid port (1-65535) but got "${String(raw)}"`);
				}

				return num;
			}
			case 'url': {
				if (typeof raw !== 'string') {
					throw new Error(`[${path}] expected URL string but got ${typeof raw}`);
				}

				try {
					new URL(raw);
					return raw;
				} catch {
					throw new Error(`[${path}] expected valid URL but got "${raw}"`);
				}
			}
			case 'host': {
				if (typeof raw !== 'string') {
					throw new Error(`[${path}] expected host string but got ${typeof raw}`);
				}

				if (!hostRegex.test(raw) && raw !== 'localhost') {
					throw new Error(`[${path}] expected valid hostname but got "${raw}"`);
				}

				return raw;
			}
			case 'uuid': {
				if (typeof raw !== 'string') {
					throw new Error(`[${path}] expected UUID string but got ${typeof raw}`);
				}

				const version = (rule as any).version || 'any';
				const regex   = version === 'v4' ? uuid4Regex : anyUuidRegex;

				if (!regex.test(raw)) {
					const versionStr = version === 'v4' ? 'v4 ' : '';
					throw new Error(`[${path}] expected valid UUID${versionStr} but got "${raw}"`);
				}

				return raw;
			}
			default:
				throw new Error(`[${path}] unsupported validation rule ${(rule as any).type}`);
		}
	}

	private validateFormat(path: string, value: string, format: StringFormat) {
		switch (format) {
			case 'host': {
				if (!hostRegex.test(value) && value !== 'localhost') {
					throw new Error(`[${path}] must be a valid hostname`);
				}
				break;
			}
			case 'url':
				try {
					new URL(value);
				} catch {
					throw new Error(`[${path}] must be a valid URL`);
				}
				break;
			case 'email': {
				if (!emailRegex.test(value)) {
					throw new Error(`[${path}] must be a valid email`);
				}
				break;
			}
		}
	}
}
