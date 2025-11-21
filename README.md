# @depthbomb/env

A .env validator for Bun heavily inspired by [@adonisjs/env](https://github.com/adonisjs/env) with some added validators.

## Installation

```sh
bun add @depthbomb/env
```

## Example/Usage

```shell
TEST1=1
TEST2=hello
TEST3=true
TEST4=00000000-0000-0000-0000-000000000000
TEST5=217188c7-30e9-4f89-8355-0427832955ea
TEST6={"a":1}
TEST7=[{"a":1},{"a":2}]
TEST8=["1",2,"3"]
#TEST9=...
TEST10=coffeescript
```

```ts
import { Env } from '@depthbomb/env';

const env = Env.create({
	/**
	 * Disallows floats
	 *
	 * Also available is `Env.schema.number()` and `Env.schema.float()`
	 */
	TEST1: Env.schema.int(),
	/**
	 * Simple strings or specific types of strings such as `email`, `host`, and `url` via the `format` option
	 */
	TEST2: Env.schema.string(),
	/**
	 * Validates truthy values as well such as `1`, `0`, `yes`, `no`, `y` and `n`
	 */
	TEST3: Env.schema.boolean(),
	/**
	 * Generic and UUIDv4 validation
	 */
	TEST4: Env.schema.uuid(),
	TEST5: Env.schema.uuid({ version: 'v4' }),
	/**
	 * Specify the shape of the JSON object
	 */
	TEST6: Env.schema.json<{ a: number; }>(),
	/**
	 * Arrays are written as JSON arrays, including double quotes for keys and string values
	 *
	 * Array items value type can be defined as a type argument
	 *
	 * Additionally, the following results in the same return type:
	 * 	```
	 * 	Env.schema.array(Env.schema.json<{ a: number; }>())
	 * 	```
	 *
	 * Differing types results in a TypeScript error:
	 *	```
	 * 	Env.schema.array<string>(Env.schema.json<{ a: number; }>())
	 *	```
	 */
	TEST7: Env.schema.array<{ a: number; }>(Env.schema.json()),
	TEST8: Env.schema.array(Env.schema.string()),
	/**
	 * All variables are required by default
	 */
	TEST9: Env.schema.string({ required: false, defaultValue: 'I\'m right here' }),
	/**
	 * Predefined values
	 */
	TEST10: Env.schema.enum(['typescript', 'javascript'] as const),
});

env.get('TEST1');  // number
env.get('TEST2');  // string
env.get('TEST3');  // boolean
env.get('TEST4');  // string
env.get('TEST5');  // string
env.get('TEST6');  // { a: number }
env.get('TEST7');  // { a: number }[]
env.get('TEST8');  // error: [TEST8[1]] expected string but got number
env.get('TEST9');  // returns "I'm right here" - if a default value wasn't defined then it would return undefined
env.get('TEST10'); // error: [TEST10] expected one of [typescript, javascript] but got "coffeescript"
```
