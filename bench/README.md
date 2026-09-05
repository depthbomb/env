# Environment validation benchmarks

Run from the repository root:

```sh
yarn bench
bun bench/env.mjs
```

The harness uses the built ESM package, 500 warmup calls per case, and seven timed
rounds. Each round performs 1,000 calls, except the 100-timezone list (100 calls)
and cached getters (1,000,000 calls). Results are microseconds per call. Environment
assignment, schema construction, and imports happen outside the timed sections.

The mixed schema contains 50 fields: strings, integers, booleans, enums, and one
each of base64, date, bytes, an existing file path, and timezone. The control
replaces the timezone rule with a string rule. Collection and getter cases check
other execution paths. The process only sets synthetic benchmark variables.

## Timezone cache results

Measured September 5, 2026, on Windows x64 with an Intel Core i7-9700K,
Node 24.17.0, and Bun 1.4.1.
The baseline is commit `31adeba`, containing all seven correctness fixes.

Node CPU sampling during the initial review placed the validation method at the
top of the profile. Single-rule measurements identified `Intl.DateTimeFormat`
construction in timezone validation as the largest measured cost. The change
caches at most 128 successfully validated timezone strings, evicts the oldest
entry when full, and never caches validation failures.

| Case | Node before (µs) | Node after (µs) | Bun before (µs) | Bun after (µs) |
| --- | ---: | ---: | ---: | ---: |
| 50-field mixed schema | 165.909 | 67.239 | 74.051 | 21.525 |
| 50-field control without timezone | 67.324 | 65.342 | 20.637 | 19.781 |
| Single timezone | 82.654 | 1.023 | 37.512 | 0.340 |
| 100 repeated timezones | 7334.356 | 32.410 | 3844.914 | 18.953 |
| 1000 unique integers | 228.853 | 204.005 | 163.706 | 162.406 |
| Cached get | 0.017 | 0.015 | 0.023 | 0.003 |

The mixed-schema median improved by **59.5% on Node** and **70.9% on Bun**,
exceeding the 10% acceptance threshold. Raw samples' minimum, median, and maximum
values are stored in `results/`. The Node comparison was repeated after a noisy
initial baseline; the table and saved Node results use that repeat. Tiny getter
timings vary with JIT optimization and should not be attributed to this change.
The integer-list timing also varies between runs; only the timezone workloads
are intended to improve.

These are warmed measurements of repeated validation. First-time validation of
each timezone still constructs a formatter, so these gains do not describe a
process that validates a single timezone only once. Cache hits preserve the
original spelling, aliases, and runtime-supported values. Regression tests cover
successful reuse, repeated invalid inputs, and eviction followed by revalidation.

## Reproducing the comparison

Build baseline commit `31adeba` in a separate checkout using `yarn install
--immutable` and `yarn build`. From the current checkout, pass the absolute path
to that checkout's built module:

```sh
node bench/env.mjs /absolute/path/to/baseline/dist/index.mjs
bun bench/env.mjs /absolute/path/to/baseline/dist/index.mjs
yarn bench
bun bench/env.mjs
```

Run each command separately to avoid CPU contention. To collect a Node CPU
profile, run `node --cpu-prof bench/env.mjs`; compare unprofiled runs for timings.
