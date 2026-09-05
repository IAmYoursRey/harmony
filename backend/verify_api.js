import fs from 'fs';
import path from 'path';

const db = JSON.parse(fs.readFileSync(path.resolve('database.json'), 'utf8'));

// Test GET /api/classes for dev as a teacher
const devId = 'seed-raihanansari6678';
const teacherClasses = db.classes.filter(c => c.teacherId === devId);
console.log('Classes for Teacher:', teacherClasses.length);

if (teacherClasses.length > 0) {
  const classId = teacherClasses[0].id;
  
  // Test GET /api/students for the class
  const classStudents = db.profiles
    .filter(p => p.classId === classId)
    .map(p => {
      const acc = db.accounts.find(a => a.id === p.userId);
      return { id: p.userId, name: acc?.name, email: acc?.email };
    });
  
  console.log('Students in Class:', classStudents.length, classStudents);
  
  // Test Analytics / dtResults
  const studentIds = classStudents.map(s => s.id);
  const classResults = db.dtResults.filter(r => studentIds.includes(r.userId));
  console.log('dtResults for Class:', classResults.length);
  
  // Test Analytics / surveys
  const classSurveys = db.surveys.filter(s => studentIds.includes(s.userId));
  console.log('Surveys for Class:', classSurveys.length);
}
