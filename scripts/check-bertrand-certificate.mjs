const primes = [3, 5, 7, 13, 23, 43, 83, 163, 317, 631, 1259];
for (const p of primes) {
  for (let d = 2; d * d <= p; d++) {
    if (p % d === 0) throw new Error(`${p} is composite: divisible by ${d}`);
  }
}
for (let n = 2; n <= 999; n++) {
  if (!primes.some((p) => n < p && p < 2 * n))
    throw new Error(`No certificate prime for n=${n}`);
}
console.log(
  'Bertrand finite certificate valid: 11 primes; all integers 2–999 covered.',
);
