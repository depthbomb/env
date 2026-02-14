import type { IPVersion, UUIDVersion, HashAlgorithm } from './enums.js';

export type Maybe<T> = T | undefined;
export interface IBaseRule<T = any> {
	required?: boolean;
	defaultValue?: T;
}
export interface IStringRule extends IBaseRule<string> {
	type: 'string';
	trim?: boolean;
	pattern?: RegExp;
	minLength?: number;
	maxLength?: number;
}
export interface INumberRule extends IBaseRule<number> {
	type: 'number';
	min?: number;
	max?: number;
	positive?: boolean;
	negative?: boolean;
	range?: [number, number];
}
export interface IIntRule extends IBaseRule<number> {
	type: 'int';
	min?: number;
	max?: number;
	positive?: boolean;
	negative?: boolean;
	range?: [number, number];
}
export interface IFloatRule extends IBaseRule<number> {
	type: 'float';
	min?: number;
	max?: number;
	positive?: boolean;
	negative?: boolean;
	range?: [number, number];
}
export interface IBooleanRule extends IBaseRule<boolean> {
	type: 'boolean';
}
export interface IEnumRule<T = any> extends IBaseRule<T> {
	type: 'enum';
	choices: readonly any[];
}
export interface IJSONRule<T = any> extends IBaseRule<T> {
	type: 'json';
	parser?: (raw: string) => T;
}
export interface IArrayRule<T = any> extends IBaseRule<T[]> {
	type: 'array';
	itemType: ValidationRule<any>;
}
export interface IListRule<T = any> extends IBaseRule<T[]> {
	type: 'list';
	itemType: ValidationRule<any>;
	separator?: string;
	trim?: boolean;
	unique?: boolean;
}
export interface IEmailRule extends IBaseRule<string> {
	type: 'email';
}
export interface IPortRule extends IBaseRule<number> {
	type: 'port';
}
export interface IURLRule extends IBaseRule<string> {
	type: 'url';
}
export interface IHostRule extends IBaseRule<string> {
	type: 'host';
}
export interface IUUIDRule extends IBaseRule<string> {
	type: 'uuid';
	version?: UUIDVersion;
}
export interface IIpAddressRule extends IBaseRule<string> {
	type: 'ipAddress';
	version?: IPVersion;
}
export interface IHashRule extends IBaseRule<string> {
	type: 'hash';
	algorithm: HashAlgorithm;
}
export interface IHexadecmialRule extends IBaseRule<string> {
	type: 'hexadecimal';
}
export type ValidationRule<T = any> =
	| IStringRule
	| INumberRule
	| IIntRule
	| IFloatRule
	| IBooleanRule
	| IEnumRule
	| IJSONRule<T>
	| IArrayRule<T>
	| IListRule<T>
	| IEmailRule
	| IPortRule
	| IURLRule
	| IHostRule
	| IUUIDRule
	| IIpAddressRule
	| IHashRule
	| IHexadecmialRule;

export type StringOptions      = Omit<IStringRule, 'type'>;
export type NumberOptions      = Omit<INumberRule, 'type'>;
export type IntOptions         = Omit<IIntRule, 'type'>;
export type FloatOptions       = Omit<IFloatRule, 'type'>;
export type BooleanOptions     = Omit<IBooleanRule, 'type'>;
export type EnumOptions<T>     = Omit<IEnumRule<T>, 'type' | 'choices'>;
export type JSONOptions<T>     = Omit<IJSONRule<T>, 'type'>;
export type ArrayOptions<T>    = Omit<IArrayRule<T>, 'type' | 'itemType'>;
export type ListOptions<T>     = Omit<IListRule<T>, 'type' | 'itemType'>;
export type EmailOptions       = Omit<IEmailRule, 'type'>;
export type PortOptions        = Omit<IPortRule, 'type'>;
export type URLOptions         = Omit<IURLRule, 'type'>;
export type HostOptions        = Omit<IHostRule, 'type'>;
export type UUIDOptions        = Omit<IUUIDRule, 'type'>;
export type IpAddressOptions   = Omit<IIpAddressRule, 'type'>;
export type HashOptions        = Omit<IHashRule, 'type' | 'algorithm'>;
export type HexadecimalOptions = Omit<IHexadecmialRule, 'type'>;

export type SchemaDefinition = Record<string, ValidationRule>;
export type RequiredFalseWithoutDefault<R> =
	R extends { required: false }
		? R extends { defaultValue: any }
			? false
			: true
		: false;
export type InferSchemaType<S extends SchemaDefinition> = {
	[K in keyof S]: RequiredFalseWithoutDefault<S[K]> extends true
		? Maybe<InferRuleType<S[K]>>
		: InferRuleType<S[K]>;
};
export type InferRuleType<R> = R extends IBaseRule<infer T> ? T : never;
