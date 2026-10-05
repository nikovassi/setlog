// Generates a realistic demo backup (6 weeks, Push/Pull/Legs) for manual QA: node scripts/make-demo-backup.mjs > demo.json
const ex = (n) => 'ex-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const plans = {
  Push: [['Bench Press', 60, 2.5], ['Overhead Press', 35, 1.25], ['Lateral Raise', 8, 0.5], ['Triceps Pushdown', 25, 1]],
  Pull: [['Barbell Row', 55, 2.5], ['Lat Pulldown', 50, 2], ['Cable Row', 45, 2], ['Biceps Curl', 12, 0.5]],
  Legs: [['Squat', 80, 2.5], ['Romanian Deadlift', 70, 2.5], ['Leg Press', 120, 5], ['Calf Raise', 60, 2.5]],
};
let id = 0;
const nid = () => `demo-${++id}`;
const data = { exercises: [], workouts: [], workoutExercises: [], sets: [], routines: [], settings: [] };
const today = new Date();
const names = Object.keys(plans);
for (let i = 0; i < 16; i++) {
  const daysAgo = 40 - Math.round(i * 2.6);
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, 18, 5);
  const name = names[i % 3];
  const w = { id: nid(), name, date: d.toISOString().slice(0, 10).replace(/.*/, () => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`), startTime: d.toISOString(), endTime: new Date(d.getTime() + (45 + (i % 4) * 4) * 60000).toISOString(), duration: (45 + (i % 4) * 4) * 60, notes: '', status: 'completed', routineId: null };
  data.workouts.push(w);
  const cycle = Math.floor(i / 3);
  plans[name].forEach(([exName, base, step], order) => {
    const we = { id: nid(), workoutId: w.id, exerciseId: ex(exName), order, notes: '', supersetGroup: null };
    data.workoutExercises.push(we);
    const weight = base + step * Math.floor(cycle / 2);
    const reps = 8 + (cycle % 2) * 2;
    for (let s = 1; s <= 3; s++) {
      data.sets.push({ id: nid(), workoutExerciseId: we.id, workoutId: w.id, exerciseId: we.exerciseId, setNumber: s, weight, reps: reps - (s === 3 ? 1 : 0), rpe: s === 3 ? 8.5 : null, isWarmup: false, completed: true, timestamp: new Date(d.getTime() + (order * 3 + s) * 180000).toISOString() });
    }
  });
}
const now = today.toISOString();
for (const n of names) data.routines.push({ id: nid(), name: n, description: '', exercises: plans[n].map(([e]) => ({ exerciseId: ex(e), sets: 3, supersetGroup: null })), createdAt: now, updatedAt: now });
process.stdout.write(JSON.stringify({ app: 'setlog', schemaVersion: 1, exportedAt: now, data }));
