import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = process.argv[2] ?? 'dist/index.mjs';
const { Env }    = await import(pathToFileURL(resolve(modulePath)).href);
const variants = [
	[Env.schema.string(), 'hello'],
	[Env.schema.int(), '3000'],
	[Env.schema.boolean(), 'true'],
	[Env.schema.enum(['development', 'production']), 'production'],
	[Env.schema.base64(), 'SGVsbG8gd29ybGQ='],
	[Env.schema.date(), '2026-01-15T12:00:00Z'],
	[Env.schema.bytes(), '64MB'],
	[Env.schema.path({
		type:   'file',
		exists: true,
	}), resolve('package.json')],
	[Env.schema.timezone(), 'America/Chicago'],
];
const mixedSchema   = {};
const controlSchema = {};
const zoneSchema = {
	ENV_BENCH_ZONE: Env.schema.timezone(),
};
const zoneListSchema = {
	ENV_BENCH_ZONE_LIST: Env.schema.list(Env.schema.timezone()),
};
const intListSchema = {
	ENV_BENCH_INT_LIST: Env.schema.list(Env.schema.int(), {
		unique: true,
	}),
};
let env;
let result;

function measure(name, action, iterations = 1000) {
	for (let i = 0; i < 500; i++) {
		result = action();
	}

	const samples = [];
	for (let round = 0; round < 7; round++) {
		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			result = action();
		}

		samples.push((performance.now() - start) * 1000 / iterations);
	}

	samples.sort((a, b) => a - b);
	console.log(JSON.stringify({
		name,
		medianUs: +samples[3].toFixed(3),
		minUs:    +samples[0].toFixed(3),
		maxUs:    +samples[6].toFixed(3),
		iterations,
	}));
}

for (let i = 0; i < 50; i++) {
	const key          = `ENV_BENCH_MIXED_${i}`;
	const [rule, value] = variants[i < variants.length ? i : i % 4];
	mixedSchema[key]    = rule;
	controlSchema[key]  = rule.type === 'timezone' ? Env.schema.string() : rule;
	process.env[key]    = value;
}

process.env.ENV_BENCH_ZONE      = 'America/Chicago';
process.env.ENV_BENCH_ZONE_LIST = Array(100).fill('America/Chicago').join(',');
process.env.ENV_BENCH_INT_LIST = Array.from({
	length: 1000,
}, (_, i) => String(i)).join(',');
env = Env.create(mixedSchema);

console.log(JSON.stringify({
	runtime:  typeof Bun === 'undefined' ? process.version : `Bun ${Bun.version}`,
	platform: process.platform,
	arch:     process.arch,
}));
measure('50-field mixed schema', () => Env.create(mixedSchema));
measure('50-field control without timezone', () => Env.create(controlSchema));
measure('single timezone', () => Env.create(zoneSchema));
measure('100 repeated timezones', () => Env.create(zoneListSchema), 100);
measure('1000 unique integers', () => Env.create(intListSchema));
measure('cached get', () => env.get('ENV_BENCH_MIXED_0'), 1_000_000);

if (!result) {
	throw new Error('Benchmark result missing');
}
