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
TEST11=typescript, javascript, bun
TEST12=5m
TEST13=64MB
TEST14=package.json
```

```ts
import { Env, UUIDVersion } from '@depthbomb/env';

const env = Env.create({
	/**
	 * Disallows floats
	 *
	 * Also available is `Env.schema.number()` and `Env.schema.float()`
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
	/**
	 * Delimited lists (defaults to comma separator)
	 */
	TEST11: Env.schema.list(Env.schema.enum(['typescript', 'javascript', 'bun']), { unique: true }),
	/**
	 * Duration strings resolved to milliseconds
	 */
	TEST12: Env.schema.duration({ minMs: 1_000, maxMs: 3_600_000 }),
	/**
	 * Byte sizes resolved to bytes
	 */
	TEST13: Env.schema.bytes({ min: 1_024, max: 1_073_741_824 }),
	/**
	 * Filesystem paths with optional existence and type checks
	 */
	TEST14: Env.schema.path({ type: 'file', exists: true }),
});

env.get('TEST1');  // number
env.get('TEST2');  // string
env.get('TEST3');  // boolean
env.get('TEST4');  // string
env.get('TEST5');  // string
env.get('TEST6');  // { a: number }
env.get('TEST7');  // { a: number }[]
env.get('TEST8');  // error: [TEST8[1]] expected string but got number
env.get('TEST9');  // undefined
env.get('TEST10'); // error: [TEST10] expected one of [typescript, javascript] but got "coffeescript"
env.get('TEST11'); // ('typescript' | 'javascript' | 'bun')[]
env.get('TEST12'); // number (milliseconds)
env.get('TEST13'); // number (bytes)
env.get('TEST14'); // string (path)
```

---

† This library will work without Bun but it will not handle .env file parsing. Use a library like `dotenv` to assign .env values to `process.env` before calling `Env.create()`.
