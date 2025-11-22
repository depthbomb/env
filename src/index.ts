if (!process.versions.bun) {
	throw new Error('@depthbomb/env is made for the Bun runtime. Because this library is inspired by @adonisjs/env, it is recommended to use that for non-Bun runtimes.');
}

export * from './lib/enums.js';
export * from './lib/env.js';
export * from './lib/regex.js';
export * from './lib/types.js';
