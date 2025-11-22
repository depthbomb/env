# @depthbomb/env

A .env validator for Bun<sup>†</sup> heavily inspired by [@adonisjs/env](https://github.com/adonisjs/env) with some added validators.

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
import { Env, UUIDVersion } from '@depthbomb/env';

const env = Env.create({
	/**
	 * Disallows floats
	 *
	 * Also available is `Env.schema.number()` and `Env.schema.float()`
	 *
	 * All support `min` and `max` options
	 */
	TEST1: Env.schema.int(),
	/**
	 * Simple strings, supports `pattern`, `minLength`, `maxLength`, and `trim` options
	 */
	TEST2: Env.schema.string(),
	/**
	 * Validates truthy values as well such as `1`, `0`, `yes`, `no`, `y`, `n`, `on, `off`, `enabled`, and `disabled`
	 */
	TEST3: Env.schema.boolean(),
	/**
	 * Generic and UUIDv4 validation
	 */
	TEST4: Env.schema.uuid(),
	TEST5: Env.schema.uuid({ version: UUIDVersion.V4 }),
	/**
	 * Specify the shape of the JSON object
	 */
	TEST6: Env.schema.json<{ a: number; }>(),
	/**
	 * Arrays are written as JSON arrays, including double quotes for keys and string values
	 *
	 * Array items value type are inferred from the inner schema or can be defined as a type argument
	 */
	TEST7: Env.schema.array(Env.schema.json<{ a: number; }>()),
	TEST8: Env.schema.array(Env.schema.string()),
	/**
	 * All variables are required by default
	 */
	TEST9: Env.schema.string({ required: false }),
	/**
	 * Predefined values
	 */
	TEST10: Env.schema.enum(['typescript', 'javascript']),
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

---

† This library will work without Bun but it will not handle .env file parsing. Use a library like `dotenv` to assign .env values to `process.env` before calling `Env.create()`.
