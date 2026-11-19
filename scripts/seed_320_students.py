import json
import os
import random
import re

db_path = os.path.join("apps", "server", "src", "database", "data", "database.json")
with open(db_path, "r", encoding="utf-8") as f:
    db = json.load(f)

cohort_path = os.path.join("scripts", "cohort_xi_320.json")
with open(cohort_path, "r", encoding="utf-8") as f:
    cohort_by_section = json.load(f)

# Classes: 9 rombel Kelas XI (XI - 1 s/d XI - 9)
classes = [
    {"id": "class_sman1ngoro_XI_1", "name": "XI - 1", "grade": "XI", "section": "1", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-siti.nurhaliza"},
    {"id": "class_sman1ngoro_XI_2", "name": "XI - 2", "grade": "XI", "section": "2", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-bambang.prasetyo"},
    {"id": "class_sman1ngoro_XI_3", "name": "XI - 3", "grade": "XI", "section": "3", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-endang.wahyuni"},
    {"id": "class_sman1ngoro_XI_4", "name": "XI - 4", "grade": "XI", "section": "4", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-ahmad.ridwan"},
    {"id": "class_sman1ngoro_XI_5", "name": "XI - 5", "grade": "XI", "section": "5", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-agus.santoso"},
    {"id": "class_sman1ngoro_XI_6", "name": "XI - 6", "grade": "XI", "section": "6", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-tri.wahyudi"},
    {"id": "class_sman1ngoro_XI_7", "name": "XI - 7", "grade": "XI", "section": "7", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-dwi.handayani"},
    {"id": "class_sman1ngoro_XI_8", "name": "XI - 8", "grade": "XI", "section": "8", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-nurul.hidayati"},
    {"id": "class_sman1ngoro_XI_9", "name": "XI - 9", "grade": "XI", "section": "9", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-suhartono"},
]

db["classes"] = classes

existing_accounts = {a["id"]: a for a in db.get("accounts", [])}
existing_profiles = {p["userId"]: p for p in db.get("profiles", [])}

extra_teachers = [
    {
        "id": "seed-agus.santoso",
        "name": "Bpk. Agus Santoso, S.Pd.",
        "role": "teacher",
        "email": "agus.santoso@sman1ngoro.sch.id",
        "createdAt": "2026-08-01T07:00:00.000Z",
        "passwordHash": "$2b$10$mn55.a/zS9WNcjkXfiF/7.6Q4.dn1s9GRHm6r8hxMIEWRL43lDv.u",
    },
    {
        "id": "seed-sri.wahyuni",
        "name": "Ibu Sri Wahyuni, S.Si.",
        "role": "teacher",
        "email": "sri.wahyuni@sman1ngoro.sch.id",
        "createdAt": "2026-08-01T07:00:00.000Z",
        "passwordHash": "$2b$10$mn55.a/zS9WNcjkXfiF/7.6Q4.dn1s9GRHm6r8hxMIEWRL43lDv.u",
    },
]
for t in extra_teachers:
    if t["id"] not in existing_accounts:
        existing_accounts[t["id"]] = t
        existing_profiles[t["id"]] = {
            "userId": t["id"],
            "name": t["name"],
            "role": "teacher",
            "grade": "XI",
            "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad",
            "schoolName": "SMAN 1 Ngoro",
            "regency": "Mojokerto",
            "province": "Jawa Timur",
            "xp": 2500,
            "level": 5,
        }

random.seed(2026)
all_student_accounts = []
all_student_profiles = []
all_quiz_histories = []
all_dt_results = []
all_surveys = []

survey_categories = ["Gempa Bumi", "Banjir", "Tsunami", "Lainnya"]
survey_dates = [
    "2026-10-14T08:20:00.000Z",
    "2026-10-16T09:15:00.000Z",
    "2026-10-21T10:05:00.000Z",
    "2026-10-25T11:30:00.000Z",
    "2026-11-02T08:40:00.000Z",
    "2026-11-04T09:25:00.000Z",
    "2026-11-06T10:10:00.000Z",
    "2026-11-09T11:00:00.000Z",
]

for c in classes:
    cid = c["id"]
    cname = c["name"]
    cgrade = c["grade"]
    csec = c["section"]
    class_code = f"{cgrade.lower()}{csec}"
    sec_students = cohort_by_section.get(csec, [])

    for num, st_item in enumerate(sec_students, start=1):
        sid = f"st-sman1ngoro-{class_code}-{num:02d}"
        s_name = st_item["name"]
        s_gender = st_item.get("gender", "male")
        s_nis = st_item.get("nis", f"6{csec}{num:02d}")
        slug_parts = re.sub(r"[^a-z0-9\s]", "", s_name.lower()).split()
        slug = ".".join(slug_parts[:2]) if slug_parts else f"siswa.{s_nis}"
        s_email = f"{slug}.{s_nis}@sman1ngoro.sch.id"

        account = {
            "id": sid,
            "name": s_name,
            "role": "student",
            "email": s_email,
            "createdAt": "2026-08-10T07:30:00.000Z",
            "passwordHash": "$2b$10$mn55.a/zS9WNcjkXfiF/7.6Q4.dn1s9GRHm6r8hxMIEWRL43lDv.u",
        }
        all_student_accounts.append(account)

        xp = random.randint(580, 1150)
        level = 2 if xp < 700 else (3 if xp < 1000 else 4)
        total_points = xp
        badges = ["first_quiz", "drill_master", "resilience_hero", "map_explorer"]
        if xp > 900:
            badges.append("evacuation_speedster")

        profile = {
            "userId": sid,
            "name": s_name,
            "gender": s_gender,
            "grade": "XI",
            "section": csec,
            "classSection": csec,
            "classId": cid,
            "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad",
            "schoolName": "SMAN 1 Ngoro",
            "regency": "Mojokerto",
            "province": "Jawa Timur",
            "xp": xp,
            "level": level,
            "totalPoints": total_points,
            "streak": random.randint(3, 14),
            "badges": badges,
            "activities": [
                {"type": "survey", "title": "Survei Kesiapsiagaan Bencana (Pre-Test)", "status": f"Selesai ({random.randint(40, 52)}/100)", "timestamp": "2026-10-08T08:15:00.000Z"},
                {"type": "quiz", "title": "Kuis: Mitigasi Gempa Bumi & Koridor Sekolah", "status": f"{random.randint(80, 95)}/100", "timestamp": "2026-10-22T09:40:00.000Z"},
                {"type": "simulation", "title": "Simulasi Digital Twin Gedung SMAN 1 Ngoro", "status": f"Berhasil (HP {random.randint(80, 95)}%)", "timestamp": "2026-10-28T10:20:00.000Z"},
                {"type": "learning", "title": "Modul Pembelajaran AI Mitigasi Cerdas", "status": "Tuntas", "timestamp": "2026-10-30T08:45:00.000Z"},
                {"type": "survey", "title": "Survei Peningkatan Resiliensi (Post-Test)", "status": f"Selesai ({random.randint(82, 94)}/100)", "timestamp": "2026-11-05T11:10:00.000Z"},
            ],
            "topicScores": {
                "Gempa Bumi": {"totalScore": 170, "averageScore": random.randint(82, 92), "totalAttempts": 2, "strongTopics": ["Drop, Cover, Hold On", "Rute Tangga Aman"]},
                "Banjir & Tsunami": {"totalScore": 160, "averageScore": random.randint(80, 90), "totalAttempts": 2, "strongTopics": ["Evakuasi Vertikal Lantai 2"]},
                "Evakuasi Mandiri": {"totalScore": 172, "averageScore": random.randint(84, 94), "totalAttempts": 2, "strongTopics": ["Titik Kumpul Lapangan Utama"]},
            },
            "pointsHistory": [
                {"date": "2026-10-08", "points": int(xp * 0.25)},
                {"date": "2026-10-22", "points": int(xp * 0.45)},
                {"date": "2026-10-28", "points": int(xp * 0.65)},
                {"date": "2026-11-02", "points": int(xp * 0.85)},
                {"date": "2026-11-09", "points": xp},
            ],
            "masteredConcepts": [
                "Drop, Cover, Hold On",
                "Titik Kumpul Lapangan Utama SMAN 1 Ngoro",
                "Rute Evakuasi Koridor Bebas Hambatan",
                "Pertolongan Pertama P3K",
            ],
            "lastUpdated": "2026-11-09T11:10:00.000Z",
        }
        all_student_profiles.append(profile)

        all_quiz_histories.append({
            "id": f"qh-{sid}-gempa",
            "userId": sid,
            "score": random.randint(80, 96),
            "topicId": "gempa-bumi",
            "createdAt": "2026-10-22T09:40:00.000Z",
            "questions": [
                {"id": "q1", "text": "Apa tindakan pertama saat terjadi gempa di kelas?", "category": "Gempa Bumi"},
                {"id": "q2", "text": "Di manakah lokasi Titik Kumpul teraman SMAN 1 Ngoro?", "category": "Evakuasi Lapangan"},
            ],
            "evaluations": [
                {"questionId": "q1", "isCorrect": True, "feedback": "Sangat tepat: Drop, Cover, Hold On."},
                {"questionId": "q2", "isCorrect": True, "feedback": "Tepat: Lapangan Utama SMAN 1 Ngoro."},
            ],
        })

        all_dt_results.append({
            "id": f"dt-{sid}-run1",
            "userId": sid,
            "mapId": "sman1ngoro_digital_twin",
            "isSuccess": True,
            "timestamp": "2026-10-28T10:20:00.000Z",
            "damageTaken": random.randint(5, 20),
            "hpRemaining": random.randint(80, 95),
            "totalObjectives": 3,
            "objectivesCompleted": 3,
            "completionTimeSeconds": random.randint(11, 15),
        })

        roll = random.random()
        if roll < 0.08:
            sv_score = random.randint(52, 66)
        elif roll < 0.28:
            sv_score = random.randint(67, 77)
        elif roll < 0.72:
            sv_score = random.randint(78, 89)
        else:
            sv_score = random.randint(90, 99)

        base_l = max(1, min(5, round(sv_score / 20)))
        q1 = max(1, min(5, base_l + (1 if random.random() > 0.65 else 0)))
        q2 = max(1, min(5, base_l - (1 if random.random() > 0.7 else 0)))
        q3 = max(1, min(5, base_l))
        q4 = max(1, min(5, base_l + (1 if random.random() > 0.75 else 0)))
        sv_cat = random.choices(survey_categories, weights=[36, 28, 21, 15], k=1)[0]

        all_surveys.append({
            "id": f"survey-{sid}",
            "userId": sid,
            "studentName": s_name,
            "email": s_email,
            "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad",
            "classId": cid,
            "className": cname,
            "grade": cgrade,
            "section": csec,
            "category": sv_cat,
            "answers": {"q1": q1, "q2": q2, "q3": q3, "q4": q4},
            "responses": [
                {"questionId": "spab_1", "value": q1},
                {"questionId": "spab_2", "value": q2},
                {"questionId": "spab_3", "value": q3},
                {"questionId": "spab_4", "value": q4},
            ],
            "score": sv_score,
            "completed": True,
            "submittedAt": survey_dates[(num + int(csec)) % len(survey_dates)],
        })

random.shuffle(all_surveys)
print(f"Generated {len(all_student_accounts)} students and {len(all_surveys)} surveys across {len(classes)} classes (XI - 1 to XI - 9).")

# Non-student accounts (teachers + dev)
non_students = [a for a in existing_accounts.values() if a.get("role") != "student"]
student_ids_set = {s["id"] for s in all_student_accounts}
non_student_profiles = []
for p in existing_profiles.values():
    uid = p.get("userId")
    acc = existing_accounts.get(uid, {})
    if acc.get("role") == "student" or uid in student_ids_set:
        continue
    if p.get("grade") in ("X", "10", "11"):
        p["grade"] = "XI"
    non_student_profiles.append(p)

db["accounts"] = non_students + all_student_accounts
db["profiles"] = non_student_profiles + all_student_profiles
db["quizHistories"] = all_quiz_histories
db["dtResults"] = all_dt_results
db["surveys"] = all_surveys

with open(db_path, "w", encoding="utf-8") as f:
    json.dump(db, f, indent=2)

print(f"Saved {db_path}: {len(db['accounts'])} total accounts ({len(all_student_accounts)} students, {len(non_students)} teachers/dev).")
