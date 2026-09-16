import fs from 'fs';
import path from 'path';

async function test() {
  console.log("Starting Persistence Test...");
  const fetch = (await import('node-fetch')).default;

  const resLogin = await fetch('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test', email: 'test_student@geosense.edu.id', password: 'password123', role: 'student', gender: 'male', grade: 'X', section: '1' })
  });
  const dataLogin = await resLogin.json();
  console.log("Register Response:", dataLogin);
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
