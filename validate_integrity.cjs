const fs = require('fs');

const db = JSON.parse(fs.readFileSync('backend/database.json', 'utf8'));

let errors = [];

db.classes.forEach(c => {
  const t = db.accounts.find(a => a.id === c.teacherId && (a.role === 'teacher' || a.role === 'dev'));
  if (!t) errors.push(`Class ${c.id} has invalid teacherId ${c.teacherId}`);
});

const students = db.accounts.filter(a => a.role === 'student');
students.forEach(s => {
  const p = db.profiles.find(p => p.userId === s.id);
  if (!p) errors.push(`Student ${s.id} has no profile`);
    if (p.classId) {
      const c = db.classes.find(cls => cls.id === p.classId);
      if (!c) errors.push(`Student ${s.id} assigned to invalid classId ${p.classId}`);
    }
});

(db.dtResults || []).forEach(r => {
  const s = db.accounts.find(a => a.id === r.userId);
  if (!s) errors.push(`Result ${r.id} has invalid student ${r.userId}`);
  const p = db.profiles.find(p => p.userId === r.userId);
  if (!p || !db.classes.find(c => c.id === p.classId)) {
    errors.push(`Result ${r.id} belongs to student ${r.userId} who has no valid class`);
  }
});

(db.surveys || []).forEach(s => {
  const u = db.accounts.find(a => a.id === s.userId);
  if (!u) errors.push(`Survey ${s.id} has invalid student ${s.userId}`);
  const p = db.profiles.find(p => p.userId === s.userId);
  if (!p || !db.classes.find(c => c.id === p.classId)) {
    errors.push(`Survey ${s.id} belongs to student ${s.userId} who has no valid class`);
  }
});

if (errors.length > 0) {
  console.log("FAIL");
  console.log(errors.join('\n'));
  process.exit(1);
} else {
  console.log("PASS");
}
