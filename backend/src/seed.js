import { supabaseAdmin } from './config/supabase.js';

async function seed() {
  console.log('Starting database seeding...');

  try {
    // 1. Create School
    console.log('Creating test school...');
    let school;
    const SCHOOL_NAME = 'Ibadan High School';
    const { data: existingSchools } = await supabaseAdmin
      .from('schools').select('*').eq('name', SCHOOL_NAME).limit(1);
    if (existingSchools && existingSchools.length > 0) {
      school = existingSchools[0];
      console.log(`Using existing school: ${school.name}`);
    } else {
      const { data: newSchool, error: schoolErr } = await supabaseAdmin
        .from('schools')
        .insert({ name: SCHOOL_NAME, address: '123 Education Way' })
        .select()
        .single();
      if (schoolErr) throw schoolErr;
      school = newSchool;
      console.log(`Created school: ${school.name}`);
    }

    // 2. Create Term
    console.log('Creating test term...');
    let term;
    const TERM_NAME = '3rd Term 2025/2026';
    const { data: existingTerms } = await supabaseAdmin
      .from('terms').select('*').eq('school_id', school.id).eq('name', TERM_NAME).limit(1);
    if (existingTerms && existingTerms.length > 0) {
      term = existingTerms[0];
      console.log(`Using existing term: ${term.name}`);
    } else {
      const { data: newTerm, error: termErr } = await supabaseAdmin
        .from('terms')
        .insert({
          school_id: school.id,
          name: '3rd Term 2025/2026',
          start_date: '2026-05-01',
          end_date: '2026-12-20'
        })
        .select()
        .single();
      if (termErr) throw termErr;
      term = newTerm;
      console.log(`Created term: ${term.name}`);
    }

    // 3. Create Section
    console.log('Creating test section...');
    let section;
    const SECTION_NAME = 'SS2 - A';
    const { data: existingSections } = await supabaseAdmin
      .from('sections').select('*').eq('term_id', term.id).eq('name', SECTION_NAME).limit(1);
    if (existingSections && existingSections.length > 0) {
      section = existingSections[0];
      console.log(`Using existing section: ${section.name}`);
    } else {
      const { data: newSec, error: secErr } = await supabaseAdmin
        .from('sections')
        .insert({
          term_id: term.id,
          name: 'SS2 - A',
          room: 'Room 25'
        })
        .select()
        .single();
      if (secErr) throw secErr;
      section = newSec;
      console.log(`Created section: ${section.name}`);
    }

    // Helper: Create Auth User & Profile
    const createOrGetUser = async (email, password, fullName, role) => {
      console.log(`Provisioning user: ${email} (${role})...`);

      // Check if profile already exists
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (existingProfile) {
        console.log(`User already exists: ${email}`);
        return existingProfile;
      }

      // Create auth user
      let authUserId;
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authErr) {
        // If user already exists in auth but profile was wiped, delete & recreate the auth user
        if (authErr.message.includes('already exists') || authErr.code === 'email_exists') {
          console.log(`Auth user exists for ${email}, deleting and recreating...`);
          const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
          const existingAuthUser = usersList?.users?.find(u => u.email === email);
          if (!existingAuthUser) throw new Error(`Could not find auth user for ${email}`);
          await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
          const { data: retryAuth, error: retryErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
          });
          if (retryErr) throw retryErr;
          authUserId = retryAuth.user.id;
        } else {
          throw authErr;
        }
      } else {
        authUserId = authData.user.id;
      }

      const userId = authUserId;

      // Create profile
      const { data: profile, error: profErr } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name: fullName,
          role,
          school_id: school.id
        })
        .select()
        .single();

      if (profErr) throw profErr;

      // If student, create student entry
      if (role === 'student') {
        const { error: studErr } = await supabaseAdmin
          .from('students')
          .insert({
            profile_id: userId,
            school_id: school.id
          });
        if (studErr) throw studErr;
      }

      return profile;
    };

    // 4. Provision Roles
    const adminUser = await createOrGetUser('admin@ihs.edu', 'AdminPass123!', 'System Administrator', 'admin');
    const teacherUser = await createOrGetUser('teacher@ihs.edu', 'TeacherPass123!', 'Mrs. Falowo', 'teacher');

    const stud1 = await createOrGetUser('student1@ihs.edu', 'StudentPass123!', 'Abdulmujeeb Ballo', 'student');
    const stud2 = await createOrGetUser('student2@ihs.edu', 'StudentPass123!', 'Taofeek Ololade', 'student');
    const stud3 = await createOrGetUser('student3@ihs.edu', 'StudentPass123!', 'Idris Adeitan', 'student');
    const stud4 = await createOrGetUser('student4@ihs.edu', 'StudentPass123!', 'Taofeek Muiz', 'student');

    // 5. Enroll Students in Section
    console.log('Enrolling students into the section...');
    const { data: studentRecords } = await supabaseAdmin
      .from('students')
      .select('id')
      .in('profile_id', [stud1.id, stud2.id, stud3.id, stud4.id]);

    for (const studentRec of studentRecords || []) {
      const { error: enrollErr } = await supabaseAdmin
        .from('enrollments')
        .insert({
          student_id: studentRec.id,
          section_id: section.id
        });

      if (enrollErr && !enrollErr.message.includes('duplicate key')) {
        console.warn(`Enrollment warning: ${enrollErr.message}`);
      }
    }

    // 6. Create Subject
    console.log('Creating Basic Science subject...');
    let subject;
    const { data: existingSubjects } = await supabaseAdmin
      .from('subjects')
      .select('*')
      .eq('section_id', section.id)
      .eq('name', 'Basic Science')
      .limit(1);

    if (existingSubjects && existingSubjects.length > 0) {
      subject = existingSubjects[0];
      console.log(`Using existing subject: ${subject.name}`);
    } else {
      const { data: newSubj, error: subjErr } = await supabaseAdmin
        .from('subjects')
        .insert({
          section_id: section.id,
          name: 'Basic Science',
          teacher_id: teacherUser.id
        })
        .select()
        .single();
      if (subjErr) throw subjErr;
      subject = newSubj;
      console.log(`Created subject: ${subject.name}`);
    }

    // 7. Create Lesson Material
    console.log('Creating lesson material...');
    const { count: lessonCount } = await supabaseAdmin
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subject.id);

    if (lessonCount === 0) {
      const { data: lesson, error: lesErr } = await supabaseAdmin
        .from('lessons')
        .insert({
          subject_id: subject.id,
          title: 'Introduction to Basic Science',
          content: 'Introduction to Basic Science covers the fundamentals of science, including biology, chemistry, and physics.',
          file_url: 'https://example.com/materials/basic_science_intro.pdf'
        })
        .select()
        .single();
      if (lesErr) throw lesErr;
      console.log(`Created lesson: ${lesson.title}`);
    }

    // 8. Create Assignment
    console.log('Creating assignment...');
    const { count: assignCount } = await supabaseAdmin
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subject.id);

    if (assignCount === 0) {
      const { data: assign, error: assErr } = await supabaseAdmin
        .from('assignments')
        .insert({
          subject_id: subject.id,
          title: 'Homework 1: Introduction to Basic Science',
          description: 'Write a simple assignment on the introduction to Basic Science. Answer the questions and submit your answers in text.',
          max_points: 10,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
        .select()
        .single();
      if (assErr) throw assErr;
      console.log(`Created assignment: ${assign.title}`);
    }

    // 9. Create Quiz & Questions
    console.log('Creating quiz...');
    const { count: quizCount } = await supabaseAdmin
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subject.id);

    if (quizCount === 0) {
      const { data: quiz, error: quizErr } = await supabaseAdmin
        .from('quizzes')
        .insert({
          subject_id: subject.id,
          title: 'Quiz 1: Introduction to Basic Science',
          description: 'Test your understanding of Basic Science fundamentals.',
          due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();
      if (quizErr) throw quizErr;
      console.log(`Created quiz: ${quiz.title}`);

      console.log('Creating quiz questions...');
      const questions = [
        {
          quiz_id: quiz.id,
          question_text: 'Basic Science is the study of:',
          question_type: 'multiple_choice',
          points: 2,
          options: ['The natural world', 'Human society', 'Mathematics', 'All of the above'],
          correct_answer: 'The natural world',
          topic: 'Basic Science'
        },
        {
          quiz_id: quiz.id,
          question_text: 'The study of living organisms is called ?',
          question_type: 'multiple_choice',
          points: 1,
          options: ['Biology', 'Chemistry', 'Physics', 'Mathematics'],
          correct_answer: 'Biology',
          topic: 'Basic Science'
        },
        {
          quiz_id: quiz.id,
          question_text: 'Which of these is not a branch of basic science ?',
          question_type: 'multiple_choice',
          points: 2,
          options: ['Biology', 'Chemistry', 'Physics', 'Mathematics'],
          correct_answer: 'Mathematics',
          topic: 'Basic Science'
        },
        {
          quiz_id: quiz.id,
          question_text: 'Basic science help us to understand ?',
          question_type: 'multiple_choice',
          points: 2,
          options: ['The natural world', 'Human society', 'Mathematics', 'All of the above'],
          correct_answer: 'The natural world',
          topic: 'Basic Science'
        }
      ];

      const { error: questErr } = await supabaseAdmin.from('questions').insert(questions);
      if (questErr) throw questErr;
      console.log('Created questions successfully.');
    }

    console.log('Database seeding finished successfully!');
  } catch (error) {
    console.error('Seeding failed with error:', error);
    process.exit(1);
  }
}

seed();
