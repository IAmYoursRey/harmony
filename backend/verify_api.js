import fs from "fs";
import path from "path";

const db = JSON.parse(fs.readFileSync(path.resolve("database.json"), "utf8"));

const devId = "seed-raihanansari6678";
const teacherClasses = db.classes.filter((c) => c.teacherId === devId);
console.log("Classes for Teacher:", teacherClasses.length);

if (teacherClasses.length > 0) {
  const classId = teacherClasses[0].id;

  const classStudents = db.profiles
    .filter((p) => p.classId === classId)
    .map((p) => {
      const acc = db.accounts.find((a) => a.id === p.userId);
      return { id: p.userId, name: acc?.name, email: acc?.email };
    });

  console.log("Students in Class:", classStudents.length, classStudents);

  const studentIds = classStudents.map((s) => s.id);
  const classResults = db.dtResults.filter((r) =>
    studentIds.includes(r.userId),
  );
  console.log("dtResults for Class:", classResults.length);

  const classSurveys = db.surveys.filter((s) => studentIds.includes(s.userId));
  console.log("Surveys for Class:", classSurveys.length);
}
