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
}
export interface IIntRule extends IBaseRule<number> {
	type: 'int';
	min?: number;
	max?: number;
}
export interface IFloatRule extends IBaseRule<number> {
	type: 'float';
	min?: number;
	max?: number;
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
export interface IUuidRule extends IBaseRule<string> {
	type: 'uuid';
	version?: UUIDVersion;
}
export interface IIpAddressRule extends IBaseRule<string> {
	type: 'ipAddress';
	version?: IPVersion;
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
	| IEmailRule
	| IPortRule
	| IURLRule
	| IHostRule
	| IUuidRule
	| IIpAddressRule;

export type StringOptions    = Omit<IStringRule, 'type'>;
export type NumberOptions    = Omit<INumberRule, 'type'>;
export type IntOptions       = Omit<IIntRule, 'type'>;
export type FloatOptions     = Omit<IFloatRule, 'type'>;
export type BooleanOptions   = Omit<IBooleanRule, 'type'>;
export type EnumOptions<T>   = Omit<IEnumRule<T>, 'type' | 'choices'>;
export type JSONOptions<T>   = Omit<IJSONRule<T>, 'type'>;
export type ArrayOptions<T>  = Omit<IArrayRule<T>, 'type' | 'itemType'>;
export type EmailOptions     = Omit<IEmailRule, 'type'>;
export type PortOptions      = Omit<IPortRule, 'type'>;
export type URLOptions       = Omit<IURLRule, 'type'>;
export type HostOptions      = Omit<IHostRule, 'type'>;
export type UuidOptions      = Omit<IUuidRule, 'type'>;
export type IpAddressOptions = Omit<IIpAddressRule, 'type'>;

export type SchemaDefinition = Record<string, ValidationRule>;
export type InferSchemaType<S extends SchemaDefinition> = {
	[K in keyof S]: S[K] extends { required: false }
	? Maybe<InferRuleType<S[K]>>
	: InferRuleType<S[K]>;
};
export type InferRuleType<R> = R extends IEnumRule<infer T>
	? T
	: R extends ValidationRule
	? R extends IBaseRule<infer T>
	? T
	: never
	: never;

export type UUIDVersion = 'any' | 'v4';
export type IPVersion   = 'ipv4' | 'ipv6';
