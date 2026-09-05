import { Env, SecretValue } from '../src/index.js';
import type {
	IEnumRule,
	IListRule,
	IArrayRule,
	ISecretValue,
	InferRuleType,
	StringOptions,
	InferRuleInput,
	InferSchemaType
} from '../src/index.js';

type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends
	(<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

const schema = {
	DEFAULT: Env.schema.string({ required: false, defaultValue: 'value' }),
	OPTIONAL: Env.schema.string({ required: false }),
	UNDEFINED_DEFAULT: Env.schema.string({ required: false, defaultValue: undefined }),
	UNDEFINED_NUMBER: Env.schema.number({ required: false, defaultValue: undefined }),
	UNDEFINED_ARRAY: Env.schema.array(Env.schema.int(), { required: false, defaultValue: undefined }),
	SECRET: Env.schema.secret({ defaultValue: 'secret' }),
};

type Values = InferSchemaType<typeof schema>;
type DefaultIsDefined = Expect<Equal<Values['DEFAULT'], string>>;
type OptionalMayBeUndefined = Expect<Equal<Values['OPTIONAL'], string | undefined>>;
type UndefinedDefaultMayBeUndefined = Expect<Equal<Values['UNDEFINED_DEFAULT'], string | undefined>>;
type UndefinedNumberMayBeUndefined = Expect<Equal<Values['UNDEFINED_NUMBER'], number | undefined>>;
type UndefinedArrayMayBeUndefined = Expect<Equal<Values['UNDEFINED_ARRAY'], number[] | undefined>>;
type SecretHasRedactedType = Expect<Equal<Values['SECRET'], ISecretValue>>;
type ExportedEnumKeepsGeneric = Expect<Equal<InferRuleType<IEnumRule<'a' | 'b'>>, 'a' | 'b'>>;
type ExportedArrayKeepsGeneric = Expect<Equal<InferRuleType<IArrayRule<number>>, number[]>>;
type ExportedListKeepsGeneric = Expect<Equal<InferRuleType<IListRule<boolean>>, boolean[]>>;

const sharedOptions = {
	required: false,
} as StringOptions;
const unionOptions = {} as {} | { required: false };
const presenceSchema = {
	JSON_OPTIONAL: Env.schema.json<{ count: number }>({
		required: false,
	}),
	JSON_REQUIRED: Env.schema.json<{ count: number }>(),
	JSON_DEFAULT: Env.schema.json<{ count: number }>({
		required: false,
		defaultValue: {
			count: 1,
		},
	}),
	SHARED_OPTIONAL: Env.schema.string(sharedOptions),
	UNION_OPTIONAL: Env.schema.string(unionOptions),
	STRING_REQUIRED: Env.schema.string(),
	STRING_CONSTRAINED: Env.schema.string({
		minLength: 1,
	}),
	NUMBER_CONSTRAINED: Env.schema.number({
		min: 1,
	}),
	NUMBER_REQUIRED: Env.schema.number(),
	ARRAY_REQUIRED: Env.schema.array(Env.schema.int()),
	LIST_REQUIRED: Env.schema.list(Env.schema.int()),
	ENUM_REQUIRED: Env.schema.enum(['a', 'b']),
};

type PresenceValues = InferSchemaType<typeof presenceSchema>;
type JSONOptionalMayBeUndefined = Expect<Equal<PresenceValues['JSON_OPTIONAL'], { count: number } | undefined>>;
type JSONRequiredIsDefined = Expect<Equal<PresenceValues['JSON_REQUIRED'], { count: number }>>;
type JSONDefaultIsDefined = Expect<Equal<PresenceValues['JSON_DEFAULT'], { count: number }>>;
type SharedOptionalMayBeUndefined = Expect<Equal<PresenceValues['SHARED_OPTIONAL'], string | undefined>>;
type UnionOptionalMayBeUndefined = Expect<Equal<PresenceValues['UNION_OPTIONAL'], string | undefined>>;
type StringRequiredIsDefined = Expect<Equal<PresenceValues['STRING_REQUIRED'], string>>;
type StringConstrainedIsDefined = Expect<Equal<PresenceValues['STRING_CONSTRAINED'], string>>;
type NumberConstrainedIsDefined = Expect<Equal<PresenceValues['NUMBER_CONSTRAINED'], number>>;
type NumberRequiredIsDefined = Expect<Equal<PresenceValues['NUMBER_REQUIRED'], number>>;
type ArrayRequiredIsDefined = Expect<Equal<PresenceValues['ARRAY_REQUIRED'], number[]>>;
type ListRequiredIsDefined = Expect<Equal<PresenceValues['LIST_REQUIRED'], number[]>>;
type EnumRequiredIsDefined = Expect<Equal<PresenceValues['ENUM_REQUIRED'], 'a' | 'b'>>;

const secretRule = Env.schema.secret();
const secretCollections = {
	ARRAY: Env.schema.array(secretRule, {
		defaultValue: ['raw-secret', new SecretValue('wrapped-secret')],
	}),
	LIST: Env.schema.list(secretRule, {
		defaultValue: ['raw-secret'],
	}),
	NESTED: Env.schema.array(Env.schema.list(secretRule), {
		defaultValue: [['raw-secret', new SecretValue('wrapped-secret')]],
	}),
};

type SecretCollectionValues = InferSchemaType<typeof secretCollections>;
type SecretInputAllowsStrings = Expect<Equal<InferRuleInput<typeof secretRule>, string | ISecretValue>>;
type SecretArrayOutputIsWrapped = Expect<Equal<SecretCollectionValues['ARRAY'], ISecretValue[]>>;
type SecretListOutputIsWrapped = Expect<Equal<SecretCollectionValues['LIST'], ISecretValue[]>>;
type NestedSecretOutputIsWrapped = Expect<Equal<SecretCollectionValues['NESTED'], ISecretValue[][]>>;

Env.schema.array(secretRule, {
	// @ts-expect-error Secret collection defaults must be strings or secret wrappers.
	defaultValue: [42],
});

function checkDynamicGet(key: string): void {
	const env = Env.create({
		PORT: Env.schema.port({
			defaultValue: 3000,
		}),
	});
	const value = env.get(key);
	// @ts-expect-error Dynamic keys must be narrowed before string operations.
	value?.toUpperCase();
	const port = env.get('PORT');
	const validPort: number = port;
	// @ts-expect-error Known numeric keys must keep their precise type.
	const invalidPort: string = port;

	if (typeof value === 'string') {
		value.toUpperCase();
	}
}

export type TypeAssertions =
	| DefaultIsDefined
	| OptionalMayBeUndefined
	| UndefinedDefaultMayBeUndefined
	| UndefinedNumberMayBeUndefined
	| UndefinedArrayMayBeUndefined
	| SecretHasRedactedType
	| ExportedEnumKeepsGeneric
	| ExportedArrayKeepsGeneric
	| ExportedListKeepsGeneric
	| JSONOptionalMayBeUndefined
	| JSONRequiredIsDefined
	| JSONDefaultIsDefined
	| SharedOptionalMayBeUndefined
	| UnionOptionalMayBeUndefined
	| StringRequiredIsDefined
	| StringConstrainedIsDefined
	| NumberConstrainedIsDefined
	| NumberRequiredIsDefined
	| ArrayRequiredIsDefined
	| ListRequiredIsDefined
	| EnumRequiredIsDefined
	| SecretInputAllowsStrings
	| SecretArrayOutputIsWrapped
	| SecretListOutputIsWrapped
	| NestedSecretOutputIsWrapped;
