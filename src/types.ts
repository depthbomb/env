export type Maybe<T> = T | undefined;
export type ValidationRule<T = any> =
	| { type: 'string';    required?: boolean; defaultValue?: T; validate?: (v: string) => boolean }
	| { type: 'number';    required?: boolean; defaultValue?: T; validate?: (v: number) => boolean }
	| { type: 'int';       required?: boolean; defaultValue?: T; validate?: (v: number) => boolean }
	| { type: 'float';     required?: boolean; defaultValue?: T; validate?: (v: number) => boolean }
	| { type: 'boolean';   required?: boolean; defaultValue?: T; validate?: (v: boolean) => boolean }
	| { type: 'enum';      required?: boolean; defaultValue?: T; choices: readonly any[]; validate?: (v: any) => boolean }
	| { type: 'json';      required?: boolean; defaultValue?: T; parser?: (raw: string) => T; validate?: (v: T) => boolean }
	| { type: 'array';     required?: boolean; defaultValue?: T; itemType: ValidationRule<any>; validate?: (v: any[]) => boolean }
	| { type: 'email';     required?: boolean; defaultValue?: T; validate?: (v: string) => boolean }
	| { type: 'port';      required?: boolean; defaultValue?: T; validate?: (v: number) => boolean }
	| { type: 'url';       required?: boolean; defaultValue?: T; validate?: (v: string) => boolean }
	| { type: 'host';      required?: boolean; defaultValue?: T; validate?: (v: string) => boolean }
	| { type: 'uuid';      required?: boolean; defaultValue?: T; version?: UUIDVersion; validate?: (v: string) => boolean }
	| { type: 'ipAddress'; required?: boolean; defaultValue?: T; version?: IPVersion; validate?: (v: string) => boolean }
;
export type SchemaDefinition = Record<string, ValidationRule>;
export type InferSchemaType<S extends SchemaDefinition> = {
	[K in keyof S]: S[K] extends { required?: false }
	? S[K] extends ValidationRule<infer U>
	? Maybe<U>
	: never
	: S[K] extends ValidationRule<infer U>
	? U
	: never;
};
export type SchemaOptions = { required?: boolean };
export type UUIDVersion   = 'any' | 'v4';
export type IPVersion     = 'ipv4' | 'ipv6';
