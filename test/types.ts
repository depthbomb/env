import { Env } from '../src';
import type { ISecretValue, InferSchemaType } from '../src';

type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends
	(<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

const schema = {
	DEFAULT: Env.schema.string({ required: false, defaultValue: 'value' }),
	OPTIONAL: Env.schema.string({ required: false }),
	UNDEFINED_DEFAULT: Env.schema.string({ required: false, defaultValue: undefined }),
	SECRET: Env.schema.secret({ defaultValue: 'secret' }),
};

type Values = InferSchemaType<typeof schema>;
type DefaultIsDefined = Expect<Equal<Values['DEFAULT'], string>>;
type OptionalMayBeUndefined = Expect<Equal<Values['OPTIONAL'], string | undefined>>;
type UndefinedDefaultMayBeUndefined = Expect<Equal<Values['UNDEFINED_DEFAULT'], string | undefined>>;
type SecretHasRedactedType = Expect<Equal<Values['SECRET'], ISecretValue>>;

export type TypeAssertions =
	| DefaultIsDefined
	| OptionalMayBeUndefined
	| UndefinedDefaultMayBeUndefined
	| SecretHasRedactedType;
