import fs from 'fs';
import path from 'path';

async function test() {
  console.log("Starting Persistence Test...");
  const fetch = (await import('node-fetch')).default;

  const fakeGoogleToken = JSON.stringify({
    email: 'test_student@geosense.edu.id',
    name: 'Test Student',
    sub: 'google_test_student_123',
    picture: ''
  });

  let resLogin = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: fakeGoogleToken })
  });
  let dataLogin = await resLogin.json();
  if (dataLogin.status === 'not_registered') {
    const resReg = await fetch('http://localhost:3001/api/auth/register-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: fakeGoogleToken,
        email: 'test_student@geosense.edu.id',
        name: 'Test Student',
        role: 'student',
        gender: 'male',
        grade: 'X',
        classSection: '1',
        schoolId: 'sch-1'
      })
    });
    dataLogin = await resReg.json();
  }
  console.log("Auth Response:", dataLogin);
  const token = dataLogin.token;
  console.log("Logged in:", !!token);

  const resProf = await fetch('http://localhost:3001/api/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const profile = (await resProf.json()).profile;
  console.log("Initial profile activities count:", profile.activities?.length || 0);

  const activities = profile.activities || [];
  activities.unshift({
    title: `Quiz Test`,
    status: `100/100`,
    timestamp: new Date().toISOString(),
    type: 'quiz'
  });
  const pointsHistory = profile.pointsHistory || [];
  pointsHistory.push({ date: new Date().toISOString().split('T')[0], points: (profile.totalPoints || 0) + 10 });
  
  const resUpdate = await fetch('http://localhost:3001/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      activities,
      pointsHistory
    })
  });
  const updatedProfile = (await resUpdate.json()).profile;
  console.log("Updated profile activities count:", updatedProfile.activities?.length || 0);

  const resProf2 = await fetch('http://localhost:3001/api/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const finalProfile = (await resProf2.json()).profile;
  console.log("Refetched profile activities count:", finalProfile.activities?.length || 0);
  console.log("Persistence successful:", finalProfile.activities?.length === updatedProfile.activities?.length);
}

test().catch(console.error);
