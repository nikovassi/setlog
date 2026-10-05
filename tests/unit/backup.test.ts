import { beforeEach, describe, expect, it } from 'vitest';
import { db, resetDbForTests } from '../../src/db';
import { seedId } from '../../src/db/seed';
import { CSV_HEADER, exportBackup, exportCSV, importBackup, parseBackup } from '../../src/services/backup';
import { saveRoutine } from '../../src/services/routines';
import * as W from '../../src/services/workouts';

const BENCH = seedId('Bench Press');

async function logBench() {
  const w = await W.startWorkout({ name: 'Upper, "A"' });
  const we = await W.addExerciseToWorkout(w.id, BENCH);
  const [s] = await W.getSets(we.id);
  await W.completeSet(s.id, true, { weight: 60, reps: 8 });
  const warm = await W.addSet(we.id);
  await W.updateSet(warm.id, { isWarmup: true, weight: 40, reps: 10 });
  await W.completeSet(warm.id);
  return (await W.finishWorkout(w.id)).workout;
}

beforeEach(async () => {
  await resetDbForTests();
});

describe('export', () => {
  it('exports every table with app and schema version', async () => {
    await logBench();
    await saveRoutine({ name: 'Push', exercises: [{ exerciseId: BENCH, sets: 3 }] });
    const b = await exportBackup();
    expect(b.app).toBe('setlog');
    expect(b.schemaVersion).toBe(1);
    expect(b.data.workouts).toHaveLength(1);
    expect(b.data.sets).toHaveLength(2);
    expect(b.data.routines).toHaveLength(1);
    expect(b.data.exercises.length).toBeGreaterThan(18);
  });

  it('exports CSV with one escaped row per completed set', async () => {
    await logBench();
    const csv = await exportCSV();
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe(CSV_HEADER.join(','));
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"Upper, ""A"""');
    expect(lines[1]).toContain('Bench Press,Chest,Barbell,1,working,60,8,,480,76');
    expect(lines[2]).toContain(',warmup,40,10,,0,');
  });
});

describe('import', () => {
  it('rejects invalid files with a readable message', () => {
    expect(parseBackup('not json')).toMatchObject({ ok: false, error: expect.stringMatching(/not valid JSON/) });
    expect(parseBackup('{"hello":1}')).toMatchObject({ ok: false, error: expect.stringMatching(/not a Setlog backup/) });
    expect(parseBackup(JSON.stringify({ app: 'setlog', schemaVersion: 99, data: {} }))).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) });
    const damaged = { app: 'setlog', schemaVersion: 1, data: { workouts: [{ id: 'x', name: 'A', date: 'yesterday', startTime: 'now', status: 'completed' }] } };
    expect(parseBackup(JSON.stringify(damaged))).toMatchObject({ ok: false, error: expect.stringMatching(/entry 1 in “workouts”/) });
    expect(parseBackup(JSON.stringify({ app: 'setlog', schemaVersion: 1, data: { sets: 'oops' } }))).toMatchObject({ ok: false });
  });

  it('previews contents and drops orphaned entries', async () => {
    await logBench();
    const b = await exportBackup();
    b.data.sets.push({ ...b.data.sets[0], id: 'orphan', workoutExerciseId: 'missing' });
    const res = parseBackup(JSON.stringify(b));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.preview.counts.workouts).toBe(1);
    expect(res.preview.counts.sets).toBe(2);
    expect(res.preview.warnings[0]).toMatch(/skipped/);
    expect(res.preview.dateRange?.from).toBe(b.data.workouts[0].date);
  });

  it('round-trips a backup with replace', async () => {
    const w = await logBench();
    const json = JSON.stringify(await exportBackup());
    await W.deleteWorkout(w.id);
    await W.startWorkout(); // current data that replace must wipe
    const res = parseBackup(json);
    if (!res.ok) throw new Error(res.error);
    await importBackup(res.preview.backup, 'replace');
    expect(await db.workouts.count()).toBe(1);
    expect(await db.workouts.get(w.id)).toMatchObject({ status: 'completed' });
    expect(await db.sets.where('workoutId').equals(w.id).count()).toBe(2);
    expect(await W.getActiveWorkout()).toBeUndefined();
  });

  it('merges without deleting current data', async () => {
    await logBench();
    const json = JSON.stringify(await exportBackup());
    await resetDbForTests();
    const mine = await logBench();
    const res = parseBackup(json);
    if (!res.ok) throw new Error(res.error);
    await importBackup(res.preview.backup, 'merge');
    expect(await db.workouts.count()).toBe(2);
    expect(await db.workouts.get(mine.id)).toBeDefined();
    // merging the same backup again is idempotent
    await importBackup(res.preview.backup, 'merge');
    expect(await db.workouts.count()).toBe(2);
  });

  it('keeps existing exercises when a backup references them without including them', async () => {
    await logBench();
    const b = await exportBackup();
    b.data.exercises = [];
    const res = parseBackup(JSON.stringify(b));
    if (!res.ok) throw new Error(res.error);
    await importBackup(res.preview.backup, 'merge');
    expect(await db.exercises.get(BENCH)).toMatchObject({ name: 'Bench Press' });
  });

  it('leaves data untouched when the write fails', async () => {
    await logBench();
    const before = await db.workouts.count();
    const res = parseBackup(JSON.stringify(await exportBackup()));
    if (!res.ok) throw new Error(res.error);
    const broken = structuredClone(res.preview.backup);
    // @ts-expect-error deliberately invalid primary key to make the transaction abort
    broken.data.sets[0].id = undefined;
    await expect(importBackup(broken, 'replace')).rejects.toBeTruthy();
    expect(await db.workouts.count()).toBe(before);
  });
});
