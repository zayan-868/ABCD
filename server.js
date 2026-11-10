// ABCD Assessment Portal - Modern Full-Stack College Student Portal & Admin Management System
// Uses Node 24 standard library: node:http, node:fs, node:path, node:crypto, node:sqlite

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'portal.db');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Initialize SQLite database
const db = new DatabaseSync(DB_FILE);

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS portal_settings (
      id TEXT PRIMARY KEY,
      college_name TEXT NOT NULL,
      portal_title TEXT NOT NULL,
      academic_term TEXT NOT NULL,
      theme_palette TEXT NOT NULL DEFAULT 'light',
      announcement_banner TEXT,
      banner_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      student_id TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      roll_no TEXT UNIQUE NOT NULL,
      register_no TEXT UNIQUE NOT NULL,
      branch TEXT NOT NULL,
      semester INTEGER NOT NULL,
      academic_year TEXT NOT NULL,
      section TEXT NOT NULL,
      dob TEXT,
      blood_group TEXT,
      gender TEXT,
      email TEXT,
      phone TEXT,
      permanent_address TEXT,
      current_address TEXT,
      guardian_name TEXT,
      guardian_relation TEXT,
      guardian_phone TEXT,
      guardian_occupation TEXT,
      photo_url TEXT,
      signature_url TEXT,
      cgpa REAL DEFAULT 8.95,
      total_credits INTEGER DEFAULT 30,
      validity_date TEXT DEFAULT '2028-02-28'
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      credits INTEGER NOT NULL,
      semester INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      total_classes INTEGER NOT NULL,
      classes_attended INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS academic_marks (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      credits INTEGER NOT NULL,
      cce_test1 REAL DEFAULT 0,
      cce_test2 REAL DEFAULT 0,
      cce_assignment REAL DEFAULT 0,
      cce_seminar REAL DEFAULT 0,
      grace_marks REAL DEFAULT 0,
      cce_total REAL DEFAULT 0,
      endsem_theory REAL DEFAULT 0,
      endsem_practical REAL DEFAULT 0,
      endsem_total REAL DEFAULT 0,
      grade_letter TEXT DEFAULT 'A',
      grade_points REAL DEFAULT 8.0
    );

    CREATE TABLE IF NOT EXISTS fees (
      student_id TEXT PRIMARY KEY,
      total_assigned REAL NOT NULL,
      paid_amount REAL NOT NULL,
      pending_dues REAL NOT NULL,
      tuition_fee REAL NOT NULL,
      hostel_fee REAL NOT NULL,
      lab_fee REAL NOT NULL,
      library_fee REAL NOT NULL,
      exam_fee REAL NOT NULL,
      hall_ticket_locked INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      txn_ref TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      receipt_no TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hall_tickets (
      student_id TEXT PRIMARY KEY,
      exam_title TEXT NOT NULL,
      exam_center TEXT NOT NULL,
      center_code TEXT NOT NULL,
      status TEXT NOT NULL,
      is_locked INTEGER DEFAULT 0,
      timetable_json TEXT NOT NULL,
      instructions TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      total_marks INTEGER NOT NULL,
      pass_marks INTEGER NOT NULL,
      status TEXT NOT NULL,
      questions_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quiz_submissions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      roll_no TEXT NOT NULL,
      start_time TEXT NOT NULL,
      submit_time TEXT NOT NULL,
      time_taken_seconds INTEGER NOT NULL,
      violation_count INTEGER DEFAULT 0,
      violation_logs_json TEXT,
      answers_json TEXT NOT NULL,
      score REAL NOT NULL,
      max_score REAL NOT NULL,
      auto_submitted INTEGER DEFAULT 0,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outreach_submissions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      roll_no TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      proof_image_base64 TEXT,
      status TEXT NOT NULL,
      awarded_marks REAL DEFAULT 0,
      target_subject_code TEXT,
      admin_remarks TEXT,
      submitted_at TEXT NOT NULL,
      reviewed_at TEXT
    );
  `);

  try {
    db.exec("ALTER TABLE students ADD COLUMN validity_date TEXT DEFAULT '2028-02-28'");
  } catch (e) {
    // Column already exists
  }
}

// 10 Official Subjects for Semester 6 B.Tech CSE
const OFFICIAL_SUBJECTS = [
  { code: 'CS601', name: 'Advanced Data Structures & Algorithms', credits: 4 },
  { code: 'CS602', name: 'Cloud Computing & Distributed Systems', credits: 4 },
  { code: 'CS603', name: 'Artificial Intelligence & Machine Learning', credits: 4 },
  { code: 'CS604', name: 'Database Management Systems & NoSQL', credits: 4 },
  { code: 'CS605', name: 'Computer Networks & Cybersecurity', credits: 3 },
  { code: 'CS606', name: 'Software Engineering & DevOps', credits: 3 },
  { code: 'CS607', name: 'Full-Stack Web Development Lab', credits: 2 },
  { code: 'CS608', name: 'Mobile Application Development', credits: 2 },
  { code: 'CS609', name: 'Cyber Law, Ethics & Intellectual Property', credits: 2 },
  { code: 'CS610', name: 'Capstone Project & Technical Seminar', credits: 2 }
];

function calculateGrade(totalScore) {
  if (totalScore >= 90) return { letter: 'O', gp: 10.0 };
  if (totalScore >= 80) return { letter: 'A+', gp: 9.0 };
  if (totalScore >= 70) return { letter: 'A', gp: 8.0 };
  if (totalScore >= 60) return { letter: 'B+', gp: 7.0 };
  if (totalScore >= 50) return { letter: 'B', gp: 6.0 };
  if (totalScore >= 40) return { letter: 'C', gp: 5.0 };
  return { letter: 'F', gp: 0.0 };
}

function updateStudentCgpa(studentId) {
  const marks = db.prepare('SELECT * FROM academic_marks WHERE student_id = ?').all(studentId);
  let totalCredits = 0;
  let totalGradePoints = 0;

  for (const m of marks) {
    const cred = Number(m.credits || 0);
    const gp = Number(m.grade_points || 0);
    totalCredits += cred;
    totalGradePoints += cred * gp;
  }

  const newCgpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 8.95;
  db.prepare('UPDATE students SET cgpa = ? WHERE id = ?').run(newCgpa, studentId);
  return newCgpa;
}

// Function to seed or update a student record with all details, marks, and attendance
function seedStudentFromData(s) {
  const studentId = `std-${s.adm}`;
  const password = s.adm + s.adm;
  const rollNo = `ADM-${s.adm}`;
  const regNo = `REG2024-${s.adm}`;
  const section = s.section || 'SECONDARY';
  const branch = `${section} Department`;
  const semester = section === 'SECONDARY' ? 2 : (section === 'SENIOR SECONDARY' ? 4 : 6);
  const academicYear = '2025-2026';
  const validityDate = s.validity_date || '2028-02-28';
  const photoUrl = 'images/avatar-silhouette.svg';
  const sigUrl = 'https://api.iconify.design/fluent-emoji:fountain-pen.svg';

  // 1. Create Student
  db.prepare(`
    INSERT OR REPLACE INTO students (
      id, username, full_name, roll_no, register_no, branch, semester,
      academic_year, section, dob, blood_group, gender, email, phone,
      permanent_address, current_address, guardian_name, guardian_relation,
      guardian_phone, guardian_occupation, photo_url, signature_url, cgpa, total_credits, validity_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    studentId,
    s.adm,
    s.full_name,
    rollNo,
    regNo,
    branch,
    semester,
    academicYear,
    section,
    s.dob,
    s.blood_group || 'O+',
    'Male',
    s.email,
    s.phone,
    s.permanent_address,
    s.current_address,
    s.father || 'Parent',
    'Father',
    s.phone,
    'Parent / Guardian',
    photoUrl,
    sigUrl,
    8.95,
    30,
    validityDate
  );

  // 2. Create User Credentials
  db.prepare(`
    INSERT OR REPLACE INTO users (id, username, password, role, student_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `user-${studentId}`,
    s.adm,
    password,
    'student',
    studentId,
    new Date().toISOString()
  );

  // 3. Attendance across 10 subjects (realistic attendance 76% to 94%)
  for (const sub of OFFICIAL_SUBJECTS) {
    const held = 40 + (parseInt(s.adm, 10) % 7) + (Math.floor(Math.random() * 3));
    const attendedPct = 0.76 + (((parseInt(s.adm, 10) * 17) % 19) / 100);
    const attended = Math.min(held, Math.max(28, Math.round(held * attendedPct)));

    db.prepare(`
      INSERT OR REPLACE INTO attendance (id, student_id, subject_code, subject_name, total_classes, classes_attended)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`att-${studentId}-${sub.code}`, studentId, sub.code, sub.name, held, attended);
  }

  // 4. Marks across 10 subjects (randomized realistic scores)
  let totalCredits = 0;
  let totalGradePoints = 0;

  for (let idx = 0; idx < OFFICIAL_SUBJECTS.length; idx++) {
    const sub = OFFICIAL_SUBJECTS[idx];
    const seedNum = (parseInt(s.adm, 10) + idx * 7) % 100;
    const t1 = 12 + (seedNum % 4); // 12-15
    const t2 = 12 + ((seedNum + 2) % 4); // 12-15
    const ass = 7.5 + ((seedNum % 5) * 0.5); // 7.5 - 9.5
    const sem = 3.5 + ((seedNum % 4) * 0.5); // 3.5 - 5.0
    const grace = (s.adm === '868' && sub.code === 'CS602') ? 4.0 : 0;
    const cceTotal = t1 + t2 + ass + sem + grace;

    const th = 48 + ((seedNum * 3) % 13); // 48-60
    const pr = 23 + ((seedNum * 2) % 6); // 23-28
    const endSemTotal = th + pr;

    const combinedScore = Math.round(((cceTotal + endSemTotal) / 150) * 100);
    const { letter, gp } = calculateGrade(combinedScore);

    totalCredits += sub.credits;
    totalGradePoints += sub.credits * gp;

    db.prepare(`
      INSERT OR REPLACE INTO academic_marks (
        id, student_id, subject_code, subject_name, credits,
        cce_test1, cce_test2, cce_assignment, cce_seminar, grace_marks, cce_total,
        endsem_theory, endsem_practical, endsem_total, grade_letter, grade_points
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `mark-${studentId}-${sub.code}`,
      studentId,
      sub.code,
      sub.name,
      sub.credits,
      t1,
      t2,
      ass,
      sem,
      grace,
      cceTotal,
      th,
      pr,
      endSemTotal,
      letter,
      gp
    );
  }

  const finalCgpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 8.95;
  db.prepare('UPDATE students SET cgpa = ? WHERE id = ?').run(finalCgpa, studentId);

  // 5. Fees
  const hostelFee = 25000 + ((parseInt(s.adm, 10) % 5) * 2000);
  const totalAssigned = 70000 + hostelFee + 10000 + 5000 + 5000;
  const isPaidFull = (parseInt(s.adm, 10) % 3 === 0);
  const paidAmount = isPaidFull ? totalAssigned : totalAssigned - 15000;
  const pendingDues = totalAssigned - paidAmount;

  db.prepare(`
    INSERT OR REPLACE INTO fees (
      student_id, total_assigned, paid_amount, pending_dues,
      tuition_fee, hostel_fee, lab_fee, library_fee, exam_fee, hall_ticket_locked
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(studentId, totalAssigned, paidAmount, pendingDues, 70000, hostelFee, 10000, 5000, 5000, 0);

  // 6. Transactions
  db.prepare(`
    INSERT OR REPLACE INTO transactions (id, student_id, txn_ref, date, category, method, amount, status, receipt_no)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `txn-${studentId}`,
    studentId,
    `TXN-2025-${s.adm}`,
    '2025-08-15 10:30 AM',
    'Semester Tuition Fee',
    'UPI / NetBanking',
    paidAmount,
    'Successful',
    `REC-${parseInt(s.adm, 10) + 90000}`
  );

  // 7. Hall ticket
  const defaultTimetable = OFFICIAL_SUBJECTS.map((sub, idx) => ({
    code: sub.code,
    name: sub.name,
    date: `2026-05-${18 + (idx * 2)}`,
    time: idx < 6 ? '09:30 AM - 12:30 PM' : '01:30 PM - 04:30 PM',
    room: idx < 6 ? 'Exam Hall A-204' : 'Computing Lab 4',
    seat: `A-${10 + (parseInt(s.adm, 10) % 40)}`
  }));

  db.prepare(`
    INSERT OR REPLACE INTO hall_tickets (
      student_id, exam_title, exam_center, center_code, status, is_locked, timetable_json, instructions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    studentId,
    'End-Semester Examinations (Spring 2026)',
    'ABCD Institute of Technology - Main Examination Complex, Block A',
    'ABCD-EXAM-01',
    'Published',
    0,
    JSON.stringify(defaultTimetable),
    '1. Hall Ticket is mandatory for entry alongside College Physical ID.\n2. Mobile phones, smartwatches, and programmable calculators are strictly prohibited.'
  );

  // 8. Outreach (for student 868)
  if (s.adm === '868') {
    db.prepare(`
      INSERT OR REPLACE INTO outreach_submissions (
        id, student_id, student_name, roll_no, title, category, description, activity_date,
        proof_image_base64, status, awarded_marks, target_subject_code, admin_remarks, submitted_at, reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'outreach-std-868',
      studentId,
      s.full_name,
      rollNo,
      'IEEE Research Paper on Edge Computing Optimization',
      'Publication',
      'First-authored research paper accepted at IEEE International Conference on Cloud and Edge Computing. Awarded official peer-review certificate.',
      '2026-03-24',
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360"><rect width="100%" height="100%" fill="%230f172a"/><rect x="20" y="20" width="560" height="320" rx="12" fill="%231e293b" stroke="%2338bdf8" stroke-width="2"/><text x="50" y="80" fill="%2338bdf8" font-size="22" font-family="sans-serif" font-weight="bold">IEEE Certificate of Technical Publication</text><text x="50" y="125" fill="%23e2e8f0" font-size="16" font-family="sans-serif">Presented to: ' + s.full_name + '</text><text x="50" y="165" fill="%2394a3b8" font-size="14" font-family="sans-serif">Paper: "Accelerating Edge Inference via Dynamic INT8 Quantization"</text><circle cx="500" cy="270" r="40" fill="%230284c7" opacity="0.4"/><text x="480" y="275" fill="%2338bdf8" font-size="12" font-family="sans-serif" font-weight="bold">VERIFIED</text></svg>',
      'Approved',
      4.0,
      'CS602',
      'Verified peer-reviewed publication. +4.0 Grace Marks officially credited to CS602.',
      '2026-03-28T10:15:00Z',
      '2026-04-02T16:40:00Z'
    );
  }
}

// Function to auto-provision any admission number on the fly
function provisionNewStudent(adm) {
  const cleanAdm = String(adm).trim();
  const check = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanAdm);
  if (check) return;

  // Check if this student is in seed dataset
  let seedStudents = [];
  try {
    const seedFilePath = path.join(__dirname, 'data', 'students_seed.json');
    if (fs.existsSync(seedFilePath)) {
      seedStudents = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));
    }
  } catch (err) {}

  const match = seedStudents.find(s => s.adm === cleanAdm);
  if (match) {
    seedStudentFromData(match);
    return;
  }

  // Fallback for any unseeded student ID
  const fallback = {
    adm: cleanAdm,
    username: cleanAdm,
    password: cleanAdm + cleanAdm,
    full_name: `Student ${cleanAdm}`,
    section: 'SECONDARY',
    validity_date: '2028-02-28',
    father: 'Parent / Guardian',
    house: 'Campus Residence',
    place: 'Tech City',
    post: 'Campus PO',
    pin: '676301',
    district: 'MALAPPURAM',
    state: 'KERALA',
    blood_group: 'O+',
    dob: '2005-05-18',
    phone: '+91 9846000000',
    email: `student.${cleanAdm}@abcd.edu`,
    permanent_address: 'Campus Residence, Tech City, PIN: 676301, MALAPPURAM, KERALA',
    current_address: `ABCD Campus Residences, Block A, Room ${cleanAdm}`
  };
  seedStudentFromData(fallback);
}

function seedDatabase(force = false) {
  // Clear previous data
  db.exec(`
    DELETE FROM portal_settings;
    DELETE FROM users;
    DELETE FROM students;
    DELETE FROM subjects;
    DELETE FROM attendance;
    DELETE FROM academic_marks;
    DELETE FROM fees;
    DELETE FROM transactions;
    DELETE FROM hall_tickets;
    DELETE FROM quizzes;
    DELETE FROM quiz_submissions;
    DELETE FROM outreach_submissions;
  `);

  const now = new Date().toISOString();

  // 1. Portal Settings
  db.prepare(`
    INSERT INTO portal_settings (id, college_name, portal_title, academic_term, theme_palette, announcement_banner, banner_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'active_settings',
    'ABCD Institute of Technology',
    'ABCD Assessment Portal',
    'Spring Term 2025-2026',
    'light',
    'Notice: End-Semester Examinations commence May 18, 2026. Please verify your Hall Ticket.',
    1
  );

  // 2. Admin Account: zayan / zayan868 ONLY
  db.prepare(`
    INSERT INTO users (id, username, password, role, student_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('user-admin-zayan', 'zayan', 'zayan868', 'admin', null, now);

  // 3. Insert 10 Official Subjects
  for (const sub of OFFICIAL_SUBJECTS) {
    db.prepare(`
      INSERT INTO subjects (id, code, name, credits, semester)
      VALUES (?, ?, ?, ?, ?)
    `).run(`sub-${sub.code}`, sub.code, sub.name, sub.credits, 6);
  }

  // 4. Quizzes
  const quizzes = [
    {
      id: 'quiz-ai-101',
      title: 'AI & Machine Learning Mid-Term Assessment',
      subject_code: 'CS603',
      subject_name: 'Artificial Intelligence & Machine Learning',
      duration_minutes: 15,
      total_marks: 25,
      pass_marks: 12,
      status: 'Available',
      created_at: '2026-05-01',
      questions: [
        {
          id: 'q1',
          question: 'Which optimization algorithm adapts the learning rate for each parameter using first and second moments of the gradients?',
          type: 'mcq',
          options: ['Stochastic Gradient Descent (SGD)', 'Adam Optimizer', 'RMSprop', 'Adagrad'],
          correct_index: 1,
          points: 5,
          explanation: 'Adam computes adaptive learning rates from first and second gradient moments.'
        },
        {
          id: 'q2',
          question: 'What technique is primarily used to prevent overfitting in deep neural networks by randomly deactivating neurons during training?',
          type: 'mcq',
          options: ['Batch Normalization', 'Dropout', 'Data Augmentation', 'Gradient Clipping'],
          correct_index: 1,
          points: 5,
          explanation: 'Dropout randomly deactivates neurons during training to prevent co-adaptation.'
        },
        {
          id: 'q3',
          question: 'In supervised classification, what metric represents the harmonic mean of precision and recall?',
          type: 'mcq',
          options: ['ROC-AUC Score', 'F1-Score', 'Mean Squared Error', 'Cross-Entropy Loss'],
          correct_index: 1,
          points: 5,
          explanation: 'F1-Score is 2 * (Precision * Recall) / (Precision + Recall).'
        },
        {
          id: 'q4',
          question: 'Which activation function mitigates the vanishing gradient problem while allowing negative values through a small slope alpha?',
          type: 'mcq',
          options: ['Sigmoid', 'Hyperbolic Tangent (Tanh)', 'Leaky ReLU', 'Softmax'],
          correct_index: 2,
          points: 5,
          explanation: 'Leaky ReLU maintains non-zero gradient for negative inputs.'
        },
        {
          id: 'q5',
          question: 'What is the primary role of Multi-Head Attention in Transformer models?',
          type: 'mcq',
          options: [
            'Compress sequences to fixed vectors',
            'Compute dynamic attention weights between tokens across representation subspaces',
            'Perform recurrent state updates sequentially',
            'Encode positional indices'
          ],
          correct_index: 1,
          points: 5,
          explanation: 'Multi-Head Attention computes attention weights dynamically across multiple subspaces.'
        }
      ]
    },
    {
      id: 'quiz-cyber-201',
      title: 'Cybersecurity & Network Protocols Check',
      subject_code: 'CS605',
      subject_name: 'Computer Networks & Cybersecurity',
      duration_minutes: 10,
      total_marks: 20,
      pass_marks: 10,
      status: 'Available',
      created_at: '2026-05-02',
      questions: [
        {
          id: 'q1',
          question: 'Which protocol operates at the Transport Layer to establish a reliable, full-duplex connection via a three-way handshake?',
          type: 'mcq',
          options: ['UDP', 'ICMP', 'TCP', 'ARP'],
          correct_index: 2,
          points: 5,
          explanation: 'TCP establishes reliable connections using SYN, SYN-ACK, and ACK.'
        },
        {
          id: 'q2',
          question: 'In asymmetric public-key cryptography (e.g., RSA), which key is used to generate a digital signature?',
          type: 'mcq',
          options: ['Public Key of Sender', 'Private Key of Sender', 'Public Key of Receiver', 'Shared Secret Key'],
          correct_index: 1,
          points: 5,
          explanation: 'A digital signature is created using the sender\'s private key.'
        },
        {
          id: 'q3',
          question: 'What type of network attack intercepts and secretly alters communication between two endpoints?',
          type: 'mcq',
          options: ['SQL Injection', 'Cross-Site Scripting (XSS)', 'Man-in-the-Middle (MITM)', 'Buffer Overflow'],
          correct_index: 2,
          points: 5,
          explanation: 'MITM attacks intercept and manipulate network communications.'
        },
        {
          id: 'q4',
          question: 'Which HTTP header prevents clickjacking attacks by blocking unauthorized iframe embedding?',
          type: 'mcq',
          options: ['X-Frame-Options: DENY', 'Content-Security-Policy: default-src *', 'Access-Control-Allow-Origin: *', 'X-XSS-Protection: 1'],
          correct_index: 0,
          points: 5,
          explanation: 'X-Frame-Options: DENY prevents iframe framing.'
        }
      ]
    }
  ];

  for (const q of quizzes) {
    db.prepare(`
      INSERT INTO quizzes (
        id, title, subject_code, subject_name, duration_minutes, total_marks, pass_marks, status, questions_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      q.id,
      q.title,
      q.subject_code,
      q.subject_name,
      q.duration_minutes,
      q.total_marks,
      q.pass_marks,
      q.status,
      JSON.stringify(q.questions),
      q.created_at
    );
  }

  // Seed all 220 students from students_seed.json inside a transaction
  let seedStudents = [];
  try {
    const seedFilePath = path.join(__dirname, 'data', 'students_seed.json');
    if (fs.existsSync(seedFilePath)) {
      seedStudents = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading students_seed.json:', err);
  }

  db.exec('BEGIN TRANSACTION');
  try {
    if (seedStudents.length > 0) {
      for (const s of seedStudents) {
        seedStudentFromData(s);
      }
    } else {
      provisionNewStudent('868');
    }

    // Enforce shadow figure silhouette avatar for all students
    db.prepare("UPDATE students SET photo_url = 'images/avatar-silhouette.svg'").run();
    db.exec('COMMIT');
  } catch (txErr) {
    db.exec('ROLLBACK');
    console.error('Transaction error during seeding:', txErr);
  }

  console.log(`Database initialized successfully with ${seedStudents.length} students.`);
  console.log('Admin account ready: zayan / zayan868');
  console.log('All student accounts ready: Username = ADM, Password = ADM + ADM');
}

// Initialize tables and seed
initDatabase();
seedDatabase(true);

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Serve static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.zip': 'application/zip'
};

function serveStatic(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  const resolvedPath = path.normalize(path.join(__dirname, 'public', safePath));
  if (!resolvedPath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      const indexPath = path.join(__dirname, 'public', 'index.html');
      fs.readFile(indexPath, (err2, content) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        }
      });
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = { 'Content-Type': contentType };
    if (ext === '.zip') {
      headers['Content-Disposition'] = `attachment; filename="${path.basename(resolvedPath)}"`;
    }
    res.writeHead(200, headers);
    fs.createReadStream(resolvedPath).pipe(res);
  });
}

// Main HTTP Server Request Handler
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    // -------------------------------------------------------------
    // API: PORTAL SETTINGS & THEME
    // -------------------------------------------------------------
    if (pathname === '/api/settings' && method === 'GET') {
      const settings = db.prepare('SELECT * FROM portal_settings WHERE id = ?').get('active_settings') || {
        college_name: 'ABCD Institute of Technology',
        portal_title: 'ABCD Assessment Portal',
        academic_term: 'Spring Term 2025-2026',
        theme_palette: 'light',
        announcement_banner: 'Notice: End-Semester Examinations commence May 18, 2026.',
        banner_active: 1
      };
      return sendJson(res, 200, { success: true, settings });
    }

    if (pathname === '/api/settings' && method === 'PUT') {
      const body = await parseJsonBody(req);
      db.prepare(`
        UPDATE portal_settings SET
          college_name = ?,
          portal_title = ?,
          academic_term = ?,
          theme_palette = ?,
          announcement_banner = ?,
          banner_active = ?
        WHERE id = ?
      `).run(
        body.college_name || 'ABCD Institute of Technology',
        body.portal_title || 'ABCD Assessment Portal',
        body.academic_term || 'Spring Term 2025-2026',
        body.theme_palette || 'light-slate',
        body.announcement_banner || '',
        body.banner_active ? 1 : 0,
        'active_settings'
      );
      return sendJson(res, 200, { success: true, message: 'Institutional settings & theme updated successfully' });
    }

    // -------------------------------------------------------------
    // API: AUTHENTICATION
    // -------------------------------------------------------------
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { username, password } = await parseJsonBody(req);
      if (!username || !password) {
        return sendJson(res, 400, { success: false, message: 'Username and password required' });
      }

      const cleanUser = String(username).trim();
      const cleanPass = String(password).trim();

      // 1. Exclusive Admin Login: zayan / zayan868 ONLY
      if (cleanUser === 'zayan' && cleanPass === 'zayan868') {
        const adminUser = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get('zayan', 'zayan868');
        return sendJson(res, 200, {
          success: true,
          user: { id: adminUser.id, username: 'zayan', role: 'admin' },
          student: null
        });
      }

      // 2. ANY student login rule: username is numeric ADM AND password is 2x that ADM
      if (/^\d+$/.test(cleanUser) && cleanPass === (cleanUser + cleanUser)) {
        let user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUser);
        if (!user) {
          // Provision on the fly for any numeric admission number!
          provisionNewStudent(cleanUser);
          user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUser);
        }
        const studentData = db.prepare('SELECT * FROM students WHERE id = ?').get(user.student_id);
        return sendJson(res, 200, {
          success: true,
          user: { id: user.id, username: user.username, role: user.role, student_id: user.student_id },
          student: studentData
        });
      }

      // Check standard student in database if password was updated
      const standardUser = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(cleanUser, cleanPass);
      if (standardUser && standardUser.role === 'student') {
        const studentData = db.prepare('SELECT * FROM students WHERE id = ?').get(standardUser.student_id);
        return sendJson(res, 200, {
          success: true,
          user: { id: standardUser.id, username: standardUser.username, role: standardUser.role, student_id: standardUser.student_id },
          student: studentData
        });
      }

      return sendJson(res, 401, {
        success: false,
        message: 'Invalid username or password. Please verify your credentials and try again.'
      });
    }

    // -------------------------------------------------------------
    // API: RESET DATA
    // -------------------------------------------------------------
    if (pathname === '/api/reset-demo' && method === 'POST') {
      seedDatabase(true);
      return sendJson(res, 200, { success: true, message: 'Data restored successfully' });
    }

    // -------------------------------------------------------------
    // API: STUDENT BUNDLE
    // -------------------------------------------------------------
    if (pathname.startsWith('/api/student-bundle/') && method === 'GET') {
      const studentId = pathname.split('/')[3];
      const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
      if (!student) {
        return sendJson(res, 404, { success: false, message: 'Student not found' });
      }

      const attendance = db.prepare('SELECT * FROM attendance WHERE student_id = ? ORDER BY subject_code ASC').all(studentId);
      const marks = db.prepare('SELECT * FROM academic_marks WHERE student_id = ? ORDER BY subject_code ASC').all(studentId);
      const fee = db.prepare('SELECT * FROM fees WHERE student_id = ?').get(studentId);
      const transactions = db.prepare('SELECT * FROM transactions WHERE student_id = ? ORDER BY id DESC').all(studentId);
      const hallTicket = db.prepare('SELECT * FROM hall_tickets WHERE student_id = ?').get(studentId);
      const quizzes = db.prepare('SELECT * FROM quizzes ORDER BY created_at DESC').all();
      const submissions = db.prepare('SELECT * FROM quiz_submissions WHERE student_id = ?').all(studentId);
      const outreach = db.prepare('SELECT * FROM outreach_submissions WHERE student_id = ? ORDER BY submitted_at DESC').all(studentId);

      if (hallTicket && hallTicket.timetable_json) {
        try { hallTicket.timetable = JSON.parse(hallTicket.timetable_json); } catch (e) { hallTicket.timetable = []; }
      }
      for (const q of quizzes) {
        try { q.questions = JSON.parse(q.questions_json); } catch (e) { q.questions = []; }
      }
      for (const s of submissions) {
        try { s.answers = JSON.parse(s.answers_json); } catch (e) { s.answers = {}; }
        try { s.violation_logs = JSON.parse(s.violation_logs_json || '[]'); } catch (e) { s.violation_logs = []; }
      }

      return sendJson(res, 200, {
        success: true,
        student,
        attendance,
        marks,
        fee,
        transactions,
        hallTicket,
        quizzes,
        submissions,
        outreach
      });
    }

    // -------------------------------------------------------------
    // API: ADMIN DASHBOARD OVERVIEW STATS
    // -------------------------------------------------------------
    if (pathname === '/api/admin/overview' && method === 'GET') {
      const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
      const totalQuizzes = db.prepare('SELECT COUNT(*) as count FROM quizzes').get().count;
      const totalSubmissions = db.prepare('SELECT COUNT(*) as count FROM quiz_submissions').get().count;
      const pendingOutreach = db.prepare("SELECT COUNT(*) as count FROM outreach_submissions WHERE status = 'Pending Review'").get().count;
      const totalFeesCollected = db.prepare('SELECT COALESCE(SUM(paid_amount), 0) as total FROM fees').get().total;
      const totalFeesPending = db.prepare('SELECT COALESCE(SUM(pending_dues), 0) as total FROM fees').get().total;
      const flaggedViolations = db.prepare('SELECT COUNT(*) as count FROM quiz_submissions WHERE violation_count > 0').get().count;

      return sendJson(res, 200, {
        success: true,
        stats: {
          totalStudents,
          totalQuizzes,
          totalSubmissions,
          pendingOutreach,
          totalFeesCollected,
          totalFeesPending,
          flaggedViolations
        }
      });
    }

    // -------------------------------------------------------------
    // API: STUDENTS CRUD & MASTER CUSTOMIZER
    // -------------------------------------------------------------
    if (pathname === '/api/students' && method === 'GET') {
      const students = db.prepare('SELECT * FROM students ORDER BY username ASC').all();
      return sendJson(res, 200, { success: true, students });
    }

    if (pathname === '/api/students' && method === 'POST') {
      const body = await parseJsonBody(req);
      const rawUser = String(body.username || '').trim();

      if (!/^\d+$/.test(rawUser)) {
        return sendJson(res, 400, { success: false, message: 'Student ID must be numeric digits (e.g. 868, 1041).' });
      }

      provisionNewStudent(rawUser);

      // If custom fields provided, update them
      const studentId = `std-${rawUser}`;
      if (body.full_name) {
        db.prepare('UPDATE students SET full_name = ?, branch = ?, semester = ? WHERE id = ?').run(
          body.full_name,
          body.branch || 'Secondary Department',
          Number(body.semester) || 2,
          studentId
        );
      }

      return sendJson(res, 201, {
        success: true,
        message: `Student account provisioned! ID: ${rawUser}, Password: ${rawUser + rawUser}`,
        studentId
      });
    }

    // MASTER STUDENT CUSTOMIZER (Updates profile, fees, hall ticket in one call)
    if (pathname.startsWith('/api/students/') && pathname.endsWith('/master-customize') && method === 'PUT') {
      const studentId = pathname.split('/')[3];
      const body = await parseJsonBody(req);

      // 1. Update Student Profile
      db.prepare(`
        UPDATE students SET
          full_name = ?,
          roll_no = ?,
          register_no = ?,
          branch = ?,
          semester = ?,
          section = ?,
          dob = ?,
          blood_group = ?,
          email = ?,
          phone = ?,
          permanent_address = ?,
          current_address = ?,
          guardian_name = ?,
          guardian_relation = ?,
          guardian_phone = ?,
          guardian_occupation = ?,
          cgpa = ?,
          validity_date = ?
        WHERE id = ?
      `).run(
        body.full_name,
        body.roll_no,
        body.register_no,
        body.branch,
        Number(body.semester),
        body.section || 'A',
        body.dob,
        body.blood_group,
        body.email,
        body.phone,
        body.permanent_address,
        body.current_address,
        body.guardian_name,
        body.guardian_relation,
        body.guardian_phone,
        body.guardian_occupation,
        Number(body.cgpa || 8.95),
        body.validity_date || '2028-02-28',
        studentId
      );

      // 2. Update Fees if provided
      if (body.fees) {
        const tuition = Math.max(0, Number(body.fees.tuition_fee || 0));
        const hostel = Math.max(0, Number(body.fees.hostel_fee || 0));
        const lab = Math.max(0, Number(body.fees.lab_fee || 0));
        const library = Math.max(0, Number(body.fees.library_fee || 0));
        const exam = Math.max(0, Number(body.fees.exam_fee || 0));
        const total = tuition + hostel + lab + library + exam;
        const paid = Math.max(0, Number(body.fees.paid_amount || 0));
        const dues = Math.max(0, total - paid);

        db.prepare(`
          UPDATE fees SET
            total_assigned = ?,
            paid_amount = ?,
            pending_dues = ?,
            tuition_fee = ?,
            hostel_fee = ?,
            lab_fee = ?,
            library_fee = ?,
            exam_fee = ?,
            hall_ticket_locked = ?
          WHERE student_id = ?
        `).run(
          total,
          paid,
          dues,
          tuition,
          hostel,
          lab,
          library,
          exam,
          body.fees.hall_ticket_locked ? 1 : 0,
          studentId
        );
      }

      // 3. Update Hall Ticket if provided
      if (body.hall_ticket) {
        db.prepare(`
          UPDATE hall_tickets SET
            exam_center = ?,
            center_code = ?,
            instructions = ?,
            is_locked = ?
          WHERE student_id = ?
        `).run(
          body.hall_ticket.exam_center || 'Main Examination Complex',
          body.hall_ticket.center_code || 'ABCD-EXAM-01',
          body.hall_ticket.instructions || 'Mandatory physical ID card required.',
          body.hall_ticket.is_locked ? 1 : 0,
          studentId
        );
      }

      return sendJson(res, 200, { success: true, message: 'All student parameters customized and saved!' });
    }

    if (pathname.startsWith('/api/students/') && method === 'DELETE') {
      const studentId = pathname.split('/')[3];
      db.prepare('DELETE FROM users WHERE student_id = ?').run(studentId);
      db.prepare('DELETE FROM students WHERE id = ?').run(studentId);
      db.prepare('DELETE FROM attendance WHERE student_id = ?').run(studentId);
      db.prepare('DELETE FROM academic_marks WHERE student_id = ?').run(studentId);
      db.prepare('DELETE FROM fees WHERE student_id = ?').run(studentId);
      db.prepare('DELETE FROM transactions WHERE student_id = ?').run(studentId);
      db.prepare('DELETE FROM hall_tickets WHERE student_id = ?').run(studentId);
      db.prepare('DELETE FROM quiz_submissions WHERE student_id = ?').run(studentId);
      db.prepare('DELETE FROM outreach_submissions WHERE student_id = ?').run(studentId);

      return sendJson(res, 200, { success: true, message: 'Student record deleted' });
    }

    // -------------------------------------------------------------
    // API: ATTENDANCE & MARKS MANAGER
    // -------------------------------------------------------------
    if (pathname.startsWith('/api/students/') && pathname.endsWith('/attendance-marks') && method === 'PUT') {
      const studentId = pathname.split('/')[3];
      const { attendance, marks } = await parseJsonBody(req);

      if (Array.isArray(attendance)) {
        for (const item of attendance) {
          const total = Math.max(1, Number(item.total_classes || 1));
          const attended = Math.min(total, Math.max(0, Number(item.classes_attended || 0)));
          db.prepare(`
            UPDATE attendance SET
              total_classes = ?,
              classes_attended = ?
            WHERE student_id = ? AND subject_code = ?
          `).run(total, attended, studentId, item.subject_code);
        }
      }

      if (Array.isArray(marks)) {
        for (const m of marks) {
          const t1 = Math.min(15, Math.max(0, Number(m.cce_test1 || 0)));
          const t2 = Math.min(15, Math.max(0, Number(m.cce_test2 || 0)));
          const ass = Math.min(10, Math.max(0, Number(m.cce_assignment || 0)));
          const sem = Math.min(10, Math.max(0, Number(m.cce_seminar || 0)));
          const grace = Math.min(10, Math.max(0, Number(m.grace_marks || 0)));
          const cceTotal = t1 + t2 + ass + sem + grace;
          const th = Math.min(60, Math.max(0, Number(m.endsem_theory || 0)));
          const pr = Math.min(40, Math.max(0, Number(m.endsem_practical || 0)));
          const endSemTotal = th + pr;
          const totalScore = cceTotal + endSemTotal;
          const { letter, gp } = calculateGrade(totalScore);

          db.prepare(`
            UPDATE academic_marks SET
              cce_test1 = ?,
              cce_test2 = ?,
              cce_assignment = ?,
              cce_seminar = ?,
              grace_marks = ?,
              cce_total = ?,
              endsem_theory = ?,
              endsem_practical = ?,
              endsem_total = ?,
              grade_letter = ?,
              grade_points = ?
            WHERE student_id = ? AND subject_code = ?
          `).run(
            t1,
            t2,
            ass,
            sem,
            grace,
            cceTotal,
            th,
            pr,
            endSemTotal,
            m.grade_letter || letter,
            Number(gp || 9),
            studentId,
            m.subject_code
          );
        }
      }

      updateStudentCgpa(studentId);
      return sendJson(res, 200, { success: true, message: 'Attendance & Marks updated successfully' });
    }

    // -------------------------------------------------------------
    // API: GRACE MARKS REVIEW
    // -------------------------------------------------------------
    if (pathname.startsWith('/api/outreach/') && pathname.endsWith('/review') && method === 'PUT') {
      const outreachId = pathname.split('/')[3];
      const { status, awarded_marks, target_subject_code, admin_remarks } = await parseJsonBody(req);

      const item = db.prepare('SELECT * FROM outreach_submissions WHERE id = ?').get(outreachId);
      if (!item) {
        return sendJson(res, 404, { success: false, message: 'Submission not found' });
      }

      const awarded = Number(awarded_marks || 0);
      const targetSub = target_subject_code || item.target_subject_code;

      db.prepare(`
        UPDATE outreach_submissions SET
          status = ?,
          awarded_marks = ?,
          target_subject_code = ?,
          admin_remarks = ?,
          reviewed_at = ?
        WHERE id = ?
      `).run(
        status,
        status === 'Approved' ? awarded : 0,
        targetSub,
        admin_remarks || '',
        new Date().toISOString(),
        outreachId
      );

      const markRecord = db.prepare('SELECT * FROM academic_marks WHERE student_id = ? AND subject_code = ?').get(item.student_id, targetSub);
      if (markRecord) {
        const newGrace = status === 'Approved' ? awarded : 0;
        const newCceTotal = Number(markRecord.cce_test1) + Number(markRecord.cce_test2) + Number(markRecord.cce_assignment) + Number(markRecord.cce_seminar) + newGrace;
        const endSemTotal = Number(markRecord.endsem_theory) + Number(markRecord.endsem_practical);
        const combinedScore = newCceTotal + endSemTotal;
        const { letter, gp } = calculateGrade(combinedScore);

        db.prepare(`
          UPDATE academic_marks SET
            grace_marks = ?,
            cce_total = ?,
            grade_letter = ?,
            grade_points = ?
          WHERE student_id = ? AND subject_code = ?
        `).run(newGrace, newCceTotal, letter, gp, item.student_id, targetSub);

        updateStudentCgpa(item.student_id);
      }

      return sendJson(res, 200, {
        success: true,
        message: status === 'Approved'
          ? `Outreach approved! +${awarded} Grace Marks credited to ${targetSub} and CGPA recalculated.`
          : 'Outreach claim rejected.'
      });
    }

    // -------------------------------------------------------------
    // API: FEES & PAYMENTS
    // -------------------------------------------------------------
    if (pathname.startsWith('/api/students/') && pathname.endsWith('/pay-fee') && method === 'POST') {
      const studentId = pathname.split('/')[3];
      const { amount, category, method: payMethod } = await parseJsonBody(req);
      const payAmount = Number(amount);

      if (!payAmount || payAmount <= 0) {
        return sendJson(res, 400, { success: false, message: 'Valid amount required' });
      }

      const fee = db.prepare('SELECT * FROM fees WHERE student_id = ?').get(studentId);
      if (!fee) {
        return sendJson(res, 404, { success: false, message: 'Fee record not found' });
      }

      const newPaid = fee.paid_amount + payAmount;
      const newDues = Math.max(0, fee.total_assigned - newPaid);
      const newLocked = newDues === 0 ? 0 : fee.hall_ticket_locked;

      db.prepare(`
        UPDATE fees SET
          paid_amount = ?,
          pending_dues = ?,
          hall_ticket_locked = ?
        WHERE student_id = ?
      `).run(newPaid, newDues, newLocked, studentId);

      const txnRef = 'TXN-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
      const receiptNo = 'REC-' + Math.floor(10000 + Math.random() * 90000);
      const nowStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

      db.prepare(`
        INSERT INTO transactions (id, student_id, txn_ref, date, category, method, amount, status, receipt_no)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `txn-${crypto.randomUUID().slice(0, 8)}`,
        studentId,
        txnRef,
        nowStr,
        category || 'Fee Payment',
        payMethod || 'UPI / Online Portal',
        payAmount,
        'Successful',
        receiptNo
      );

      return sendJson(res, 200, {
        success: true,
        message: 'Payment processed successfully',
        paid_amount: newPaid,
        pending_dues: newDues,
        receipt_no: receiptNo,
        txn_ref: txnRef
      });
    }

    // -------------------------------------------------------------
    // API: HALL TICKET LOCK
    // -------------------------------------------------------------
    if (pathname.startsWith('/api/students/') && pathname.endsWith('/hall-ticket-lock') && method === 'PUT') {
      const studentId = pathname.split('/')[3];
      const { is_locked } = await parseJsonBody(req);
      const lockVal = is_locked ? 1 : 0;

      db.prepare('UPDATE fees SET hall_ticket_locked = ? WHERE student_id = ?').run(lockVal, studentId);
      db.prepare('UPDATE hall_tickets SET is_locked = ? WHERE student_id = ?').run(lockVal, studentId);

      return sendJson(res, 200, { success: true, message: `Hall ticket visibility ${lockVal ? 'locked' : 'unlocked'}` });
    }

    // -------------------------------------------------------------
    // API: QUIZZES
    // -------------------------------------------------------------
    if (pathname === '/api/quizzes' && method === 'GET') {
      const quizzes = db.prepare('SELECT * FROM quizzes ORDER BY created_at DESC').all();
      for (const q of quizzes) {
        try { q.questions = JSON.parse(q.questions_json); } catch (e) { q.questions = []; }
      }
      return sendJson(res, 200, { success: true, quizzes });
    }

    if (pathname === '/api/quizzes' && method === 'POST') {
      const body = await parseJsonBody(req);
      const quizId = 'quiz-' + crypto.randomUUID().slice(0, 8);
      const questions = Array.isArray(body.questions) ? body.questions : [];
      let totalMarks = 0;
      for (const q of questions) totalMarks += Number(q.points || 5);

      db.prepare(`
        INSERT INTO quizzes (
          id, title, subject_code, subject_name, duration_minutes, total_marks, pass_marks, status, questions_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        quizId,
        body.title || 'New Assessment',
        body.subject_code || 'CS601',
        body.subject_name || 'Advanced Data Structures & Algorithms',
        Number(body.duration_minutes) || 15,
        totalMarks || Number(body.total_marks) || 20,
        Math.floor((totalMarks || 20) * 0.4),
        body.status || 'Available',
        JSON.stringify(questions),
        new Date().toISOString().split('T')[0]
      );

      return sendJson(res, 201, { success: true, message: 'Quiz created successfully', quizId });
    }

    if (pathname.startsWith('/api/quizzes/') && pathname.endsWith('/submit') && method === 'POST') {
      const quizId = pathname.split('/')[3];
      const { student_id, student_name, roll_no, start_time, submit_time, time_taken_seconds, violation_count, violation_logs, answers, auto_submitted } = await parseJsonBody(req);

      const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
      if (!quiz) {
        return sendJson(res, 404, { success: false, message: 'Quiz not found' });
      }

      let questions = [];
      try { questions = JSON.parse(quiz.questions_json); } catch (e) { questions = []; }

      let score = 0;
      for (const q of questions) {
        const studentAns = answers ? answers[q.id] : undefined;
        if (studentAns !== undefined && Number(studentAns) === Number(q.correct_index)) {
          score += Number(q.points || 5);
        }
      }

      const subId = 'sub-' + crypto.randomUUID().slice(0, 8);

      db.prepare(`
        INSERT INTO quiz_submissions (
          id, quiz_id, student_id, student_name, roll_no, start_time, submit_time,
          time_taken_seconds, violation_count, violation_logs_json, answers_json,
          score, max_score, auto_submitted, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        subId,
        quizId,
        student_id,
        student_name || 'Student',
        roll_no || '2023-CSE-868',
        start_time || new Date().toISOString(),
        submit_time || new Date().toISOString(),
        Number(time_taken_seconds || 0),
        Number(violation_count || 0),
        JSON.stringify(violation_logs || []),
        JSON.stringify(answers || {}),
        score,
        quiz.total_marks,
        auto_submitted ? 1 : 0,
        'Graded'
      );

      return sendJson(res, 200, {
        success: true,
        message: auto_submitted ? 'Quiz auto-submitted due to lockdown violation.' : 'Quiz submitted successfully!',
        score,
        max_score: quiz.total_marks,
        violation_count: Number(violation_count || 0)
      });
    }

    if (pathname === '/api/quiz-submissions' && method === 'GET') {
      const submissions = db.prepare(`
        SELECT qs.*, q.title as quiz_title, q.subject_code, q.subject_name
        FROM quiz_submissions qs
        LEFT JOIN quizzes q ON qs.quiz_id = q.id
        ORDER BY qs.submit_time DESC
      `).all();

      for (const s of submissions) {
        try { s.answers = JSON.parse(s.answers_json); } catch (e) { s.answers = {}; }
        try { s.violation_logs = JSON.parse(s.violation_logs_json || '[]'); } catch (e) { s.violation_logs = []; }
      }

      return sendJson(res, 200, { success: true, submissions });
    }

    if (pathname.startsWith('/api/quiz-submissions/') && pathname.endsWith('/override') && method === 'PUT') {
      const subId = pathname.split('/')[3];
      const { score, status } = await parseJsonBody(req);

      db.prepare(`
        UPDATE quiz_submissions SET
          score = ?,
          status = ?
        WHERE id = ?
      `).run(Number(score), status || 'Overridden', subId);

      return sendJson(res, 200, { success: true, message: 'Score updated successfully' });
    }

    // -------------------------------------------------------------
    // API: OUTREACH
    // -------------------------------------------------------------
    if (pathname === '/api/outreach' && method === 'GET') {
      const studentId = parsedUrl.searchParams.get('student_id');
      let query = 'SELECT * FROM outreach_submissions';
      let params = [];
      if (studentId) {
        query += ' WHERE student_id = ?';
        params.push(studentId);
      }
      query += ' ORDER BY submitted_at DESC';

      const items = db.prepare(query).all(...params);
      return sendJson(res, 200, { success: true, outreach: items });
    }

    if (pathname === '/api/outreach' && method === 'POST') {
      const body = await parseJsonBody(req);
      const outreachId = 'outreach-' + crypto.randomUUID().slice(0, 8);

      db.prepare(`
        INSERT INTO outreach_submissions (
          id, student_id, student_name, roll_no, title, category, description,
          activity_date, proof_image_base64, status, awarded_marks, target_subject_code,
          admin_remarks, submitted_at, reviewed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        outreachId,
        body.student_id,
        body.student_name || 'Alex Rivera',
        body.roll_no || '2023-CSE-868',
        body.title,
        body.category || 'Publication',
        body.description || '',
        body.activity_date || new Date().toISOString().split('T')[0],
        body.proof_image_base64 || '',
        'Pending Review',
        0,
        body.target_subject_code || 'CS602',
        null,
        new Date().toISOString(),
        null
      );

      return sendJson(res, 201, { success: true, message: 'Outreach evidence submitted for Admin verification', id: outreachId });
    }

    // Fallback: Static files
    return serveStatic(req, res, pathname);

  } catch (error) {
    console.error('API Error:', error);
    return sendJson(res, 500, { success: false, message: error.message || 'Internal Server Error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`   ABCD Assessment Portal Server Active`);
  console.log(`   Port: http://localhost:${PORT}`);
  console.log(`   Admin Login: zayan (confidential)`);
  console.log(`   Any 3-digit student ID auto-opens portal (e.g. 868 / 868868)`);
  console.log(`=======================================================`);
});
