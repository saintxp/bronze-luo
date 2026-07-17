/**
 * 铜声·识洛 — InkPaintingUtils unit tests
 *
 * Tests pure utility functions (no DOM required):
 * - makeSeededRng: deterministic seeded random
 * - toGsapEase: easing name → GSAP ease string mapping
 */
import { describe, it, expect } from 'vitest';
import { makeSeededRng } from '../ui/InkPaintingUtils';
import { toGsapEase } from '../engine/AnimationEngine';

describe('makeSeededRng', () => {
  it('produces deterministic sequence for same seed', () => {
    const rng1 = makeSeededRng('test-seed');
    const rng2 = makeSeededRng('test-seed');
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = makeSeededRng('seed-a');
    const rng2 = makeSeededRng('seed-b');
    const seq1 = Array.from({ length: 5 }, () => rng1.next());
    const seq2 = Array.from({ length: 5 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it('next() returns values in [0, 1)', () => {
    const rng = makeSeededRng('range-test');
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('range(a, b) returns values in [a, b)', () => {
    const rng = makeSeededRng('range-ab');
    for (let i = 0; i < 50; i++) {
      const v = rng.range(10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
  });

  it('chance(p) respects probability over many trials', () => {
    const rng = makeSeededRng('chance-test');
    const trials = 1000;
    let hits = 0;
    for (let i = 0; i < trials; i++) {
      if (rng.chance(0.5)) hits++;
    }
    // Should be roughly 500 ± 50 (3 sigma for binomial)
    expect(hits).toBeGreaterThan(400);
    expect(hits).toBeLessThan(600);
  });

  it('salt parameter shifts the sequence', () => {
    const rng1 = makeSeededRng('same', 0);
    const rng2 = makeSeededRng('same', 42);
    expect(rng1.next()).not.toEqual(rng2.next());
  });
});

describe('toGsapEase', () => {
  it('maps known easing names correctly', () => {
    expect(toGsapEase('linear')).toBe('none');
    expect(toGsapEase('ease-out')).toBe('power2.out');
    expect(toGsapEase('ease-in-out')).toBe('power2.inOut');
    expect(toGsapEase('ease-out-back')).toBe('back.out(1.7)');
    expect(toGsapEase('ease-out-elastic')).toBe('elastic.out(1, 0.5)');
    expect(toGsapEase('ease-out-bounce')).toBe('bounce.out');
    expect(toGsapEase('ease-out-expo')).toBe('expo.out');
    expect(toGsapEase('ease-out-cubic')).toBe('cubic.out');
    expect(toGsapEase('ease-in-out-cubic')).toBe('cubic.inOut');
    expect(toGsapEase('ease-in')).toBe('power2.in');
  });

  it('falls back to power2.out for unknown names', () => {
    expect(toGsapEase('nonexistent')).toBe('power2.out');
    expect(toGsapEase('')).toBe('power2.out');
  });
});
