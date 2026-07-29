/**
 * seed-attendance.js
 *
 * Generates realistic dummy attendance records for the entire term up to today,
 * for every student enrolled in the seeded section.
 *
 * Profiles are varied so the at-risk flag system has interesting data to show:
 *   - Student 1 (Abdulmujeeb): ~60% attendance  → Critical flag
 *   - Student 2 (Taofeek O):   ~76% attendance  → Warning flag
 *   - Student 3 (Idris):       ~92% attendance  → Clear
 *   - Student 4 (Taofeek M):   ~88% attendance  → Clear
 *
 * Run:  npm run seed:attendance
 */

import { supabaseAdmin } from './config/supabase.js';

// ── Config ──────────────────────────────────────────────────────────────────

const SCHOOL_NAME = 'Ibadan Boys High School';
const TERM_NAME = '3rd Term 2025/2026';
const SECTION_NAME = 'SS2 - A';

// Seeded teacher email (used as recorded_by)
const TEACHER_EMAIL = 'teacher@ihs.edu';

// Attendance profiles: { email → weight distribution }
// Weights are cumulative probabilities for: present, tardy, excused, absent
// e.g. [0.60, 0.65, 0.68, 1.0] means 60% present, 5% tardy, 3% excused, 32% absent
const PROFILES = {
  'student1@ihs.edu': [0.58, 0.62, 0.65, 1.0],  // ~60% present+tardy → Critical
  'student2@ihs.edu': [0.72, 0.76, 0.79, 1.0],  // ~76% present+tardy → Warning
  'student3@ihs.edu': [0.89, 0.92, 0.94, 1.0],  // ~92% present+tardy → Clear
  'student4@ihs.edu': [0.84, 0.88, 0.90, 1.0],  // ~88% present+tardy → Clear
};

const STATUSES = ['present', 'tardy', 'excused', 'absent'];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns all weekdays (Mon–Fri) between two dates, inclusive. */
function getWeekdays(startDate, endDate) {
  const days = [];
  const cur = new Date(startDate);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  while (cur <= end) {
    const day = cur.getUTCDay(); // 0 = Sun, 6 = Sat
    if (day >= 1 && day <= 5) {
      days.push(cur.toISOString().split('T')[0]);
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

/** Pick a status based on weighted probabilities. */
function pickStatus(weights) {
  const r = Math.random();
  for (let i = 0; i < weights.length; i++) {
    if (r <= weights[i]) return STATUSES[i];
  }
  return 'absent';
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function seedAttendance() {
  console.log('🎓 Attendance seeder starting...\n');

  // 1. Resolve school
  const { data: schools } = await supabaseAdmin
    .from('schools').select('id').eq('name', SCHOOL_NAME).limit(1);
  if (!schools?.length) throw new Error(`School "${SCHOOL_NAME}" not found. Run npm run seed first.`);
  const schoolId = schools[0].id;
  console.log(`✔  School:  ${SCHOOL_NAME}`);

  // 2. Resolve term
  const { data: terms } = await supabaseAdmin
    .from('terms').select('id, start_date, end_date').eq('school_id', schoolId).eq('name', TERM_NAME).limit(1);
  if (!terms?.length) throw new Error(`Term "${TERM_NAME}" not found. Run npm run seed first.`);
  const term = terms[0];
  console.log(`✔  Term:    ${TERM_NAME} (${term.start_date} → ${term.end_date})`);

  // 3. Resolve section
  const { data: sections } = await supabaseAdmin
    .from('sections').select('id').eq('term_id', term.id).eq('name', SECTION_NAME).limit(1);
  if (!sections?.length) throw new Error(`Section "${SECTION_NAME}" not found. Run npm run seed first.`);
  const sectionId = sections[0].id;
  console.log(`✔  Section: ${SECTION_NAME} (${sectionId})\n`);

  // 4. Resolve teacher profile ID (used as recorded_by)
  const { data: teacherProfiles } = await supabaseAdmin
    .from('profiles').select('id').eq('email', TEACHER_EMAIL).limit(1);
  const teacherId = teacherProfiles?.[0]?.id ?? null;

  // 5. Get all enrolled students with their profiles
  const { data: enrollments, error: enrollErr } = await supabaseAdmin
    .from('enrollments')
    .select(`
      student_id,
      student:student_id (
        id,
        profiles:profile_id (email, full_name)
      )
    `)
    .eq('section_id', sectionId);

  if (enrollErr) throw enrollErr;
  if (!enrollments?.length) throw new Error('No enrolled students found. Run npm run seed first.');

  console.log(`Found ${enrollments.length} enrolled student(s):\n`);
  enrollments.forEach(e => {
    const email = e.student?.profiles?.email;
    const name = e.student?.profiles?.full_name;
    const profile = PROFILES[email] ?? PROFILES['student4@ihs.edu']; // fallback to clear profile
    console.log(`  • ${name} (${email}) — profile weights: [${profile.join(', ')}]`);
  });

  // 6. Generate weekdays from term start → today (don't seed future dates)
  const today = new Date().toISOString().split('T')[0];
  const seedEnd = today < term.end_date ? today : term.end_date;
  const weekdays = getWeekdays(term.start_date, seedEnd);

  console.log(`\n📅 Generating records for ${weekdays.length} school days (${term.start_date} → ${seedEnd})...\n`);

  // 7. Build all upsert records
  const records = [];
  for (const enrollment of enrollments) {
    const studentId = enrollment.student_id;
    const email = enrollment.student?.profiles?.email;
    const name = enrollment.student?.profiles?.full_name;
    const weights = PROFILES[email] ?? PROFILES['student4@ihs.edu'];

    let counts = { present: 0, tardy: 0, excused: 0, absent: 0 };

    for (const date of weekdays) {
      const status = pickStatus(weights);
      counts[status]++;
      records.push({
        section_id: sectionId,
        student_id: studentId,
        date,
        status,
        recorded_by: teacherId,
      });
    }

    const activeRate = ((counts.present + counts.tardy) / weekdays.length * 100).toFixed(1);
    console.log(
      `  ✔ ${name}: ${weekdays.length} days → ` +
      `P:${counts.present} T:${counts.tardy} E:${counts.excused} A:${counts.absent} ` +
      `(${activeRate}% attendance rate)`
    );
  }

  // 8. Upsert in batches of 500 (Supabase limit per request)
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('attendance')
      .upsert(batch, { onConflict: 'student_id,date' });

    if (error) throw error;
    inserted += batch.length;
    process.stdout.write(`\r  ↑ Upserted ${inserted}/${records.length} records...`);
  }

  console.log(`\n\n✅ Done! ${records.length} attendance records seeded successfully.`);
  console.log('\nYou can now open the Attendance Grid tab to see the full term view.');
}

seedAttendance().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message || err);
  process.exit(1);
});
