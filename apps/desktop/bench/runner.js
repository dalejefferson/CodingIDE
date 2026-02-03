/**
 * Simple benchmark runner for CodingIDE Desktop.
 * Usage: npm run bench
 */

import { performance } from 'node:perf_hooks'

class Benchmark {
  constructor(name) {
    this.name = name
    this.results = []
  }

  async run(fn, iterations = 1000) {
    // Warmup
    for (let i = 0; i < Math.min(100, iterations); i++) {
      await fn()
    }

    // Measure
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await fn()
      this.results.push(performance.now() - start)
    }

    this.report(iterations)
  }

  report(iterations) {
    const sorted = [...this.results].sort((a, b) => a - b)
    const sum = sorted.reduce((acc, v) => acc + v, 0)
    const avg = sum / sorted.length
    const median = sorted[Math.floor(sorted.length / 2)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]

    console.log(`\n  ${this.name} (${iterations} iterations)`)
    console.log(`    avg: ${avg.toFixed(4)}ms`)
    console.log(`    median: ${median.toFixed(4)}ms`)
    console.log(`    p95: ${p95.toFixed(4)}ms`)
    console.log(`    p99: ${p99.toFixed(4)}ms`)
    console.log(`    ops/sec: ${(1000 / avg).toFixed(0)}`)
  }
}

async function main() {
  console.log('\nCodingIDE Desktop — Benchmarks\n' + '='.repeat(40))

  const jsonBench = new Benchmark('JSON round-trip')
  await jsonBench.run(() => {
    const obj = { name: 'test', value: 42, nested: { items: [1, 2, 3] } }
    JSON.parse(JSON.stringify(obj))
  }, 10000)

  const arrayBench = new Benchmark('Array map/filter/reduce')
  await arrayBench.run(() => {
    const arr = Array.from({ length: 100 }, (_, i) => i)
    arr
      .map((x) => x * 2)
      .filter((x) => x % 4 === 0)
      .reduce((acc, x) => acc + x, 0)
  }, 10000)

  console.log('\n' + '='.repeat(40))
  console.log('Done.\n')
}

main().catch(console.error)
