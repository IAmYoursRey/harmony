import json
import os
import random
import uuid

db_path = os.path.join("apps", "server", "src", "database", "data", "database.json")
with open(db_path, "r", encoding="utf-8") as f:
    db = json.load(f)

# Classes: 10 rombel (X-1 s/d X-5 and XI-1 s/d XI-5)
classes = [
    {"id": "class_sman1ngoro_X_1", "name": "X - 1", "grade": "X", "section": "1", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-siti.nurhaliza"},
    {"id": "class_sman1ngoro_X_2", "name": "X - 2", "grade": "X", "section": "2", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-bambang.prasetyo"},
    {"id": "class_sman1ngoro_X_3", "name": "X - 3", "grade": "X", "section": "3", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-endang.wahyuni"},
    {"id": "class_sman1ngoro_X_4", "name": "X - 4", "grade": "X", "section": "4", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-ahmad.ridwan"},
    {"id": "class_sman1ngoro_X_5", "name": "X - 5", "grade": "X", "section": "5", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-agus.santoso"},
    {"id": "class_sman1ngoro_XI_1", "name": "XI - 1", "grade": "XI", "section": "1", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-tri.wahyudi"},
    {"id": "class_sman1ngoro_XI_2", "name": "XI - 2", "grade": "XI", "section": "2", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-dwi.handayani"},
    {"id": "class_sman1ngoro_XI_3", "name": "XI - 3", "grade": "XI", "section": "3", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-nurul.hidayati"},
    {"id": "class_sman1ngoro_XI_4", "name": "XI - 4", "grade": "XI", "section": "4", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-suhartono"},
    {"id": "class_sman1ngoro_XI_5", "name": "XI - 5", "grade": "XI", "section": "5", "academicYear": "2026/2027", "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad", "teacherId": "seed-sri.wahyuni"},
]

db["classes"] = classes

# Existing accounts & profiles map
existing_accounts = {a["id"]: a for a in db.get("accounts", [])}
existing_profiles = {p["userId"]: p for p in db.get("profiles", [])}

# Ensure the 2 new teachers exist
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
            "schoolId": "ffdcdf34-fc99-4209-913e-5a6042e957ad",
            "schoolName": "SMAN 1 Ngoro",
            "regency": "Mojokerto",
            "province": "Jawa Timur",
            "xp": 2500,
            "level": 5,
        }

# Generate 320 student accounts (32 per class)
first_names = [
    "Aditya", "Budi", "Dimas", "Farhan", "Gilang", "Ilham", "Maulana", "Raditya",
    "Rizky", "Yoga", "Fajar", "Bagas", "Bayu", "Hendra", "Arya", "Anisa", "Citra",
    "Dewi", "Fitri", "Indah", "Lestari", "Putri", "Rina", "Sari", "Zahra", "Nabila",
    "Tiara", "Maya", "Anggun", "Salsabila", "Alif", "Wahyu", "Bintang", "Surya",
    "Cahya", "Naufal", "Rafi", "Daffa", "Hanif", "Syahrul", "Arif", "Teguh", "Rahmat",
    "Dani", "Aldi", "Reza", "Genta", "Agung", "Satria", "Eka", "Dwi", "Tri", "Kurnia",
    "Aulia", "Dinda", "Salma", "Alya", "Kharisma", "Mega", "Ratna", "Intan", "Melati",
    "Wulandari", "Kusuma", "Ayu", "Widya", "Retno", "Kiki", "Novi", "Desi", "Amalia",
    "Galih", "Hafiz", "Irfan", "Joko", "Lukman", "Nugraha", "Panji", "Rangga", "Sandy",
    "Taufik", "Vicky", "Yusuf", "Zainal", "Bella", "Chandra", "Dian", "Evi", "Gita"
]
last_names = [
    "Pratama", "Saputra", "Wijaya", "Kusuma", "Santoso", "Hidayat", "Setiawan",
    "Nugroho", "Utomo", "Wibowo", "Ramadhan", "Firmansyah", "Permana", "Wardhana",
    "Siregar", "Hadi", "Susanto", "Prasetyo", "Wahyudi", "Kurniawan", "Gunawan",
    "Purnomo", "Syahputra", "Mahendra", "Subekti", "Irawan", "Wicaksono", "Ananda",
    "Rahayu", "Safitri", "Astuti", "Handayani", "Anggraini", "Puspitasari", "Oktaviani",
    "Lestari", "Maharani", "Fitriyani", "Nuraini", "Damayanti", "Wati", "Suryani"
]

random.seed(2026)
all_student_accounts = []
all_student_profiles = []
all_quiz_histories = list(db.get("quizHistories", []))
all_dt_results = list(db.get("dtResults", []))
all_surveys = list(db.get("surveys", []))

used_names = set()
used_emails = set()

# Index existing students
existing_student_list = [a for a in db.get("accounts", []) if a.get("role") == "student"]

student_idx = 0
for c in classes:
    cid = c["id"]
    cname = c["name"]
    cgrade = c["grade"]
    csec = c["section"]
    class_code = f"{cgrade.lower()}{csec}"

    for num in range(1, 33): # 32 students per class
        sid = f"st-sman1ngoro-{class_code}-{num:02d}"

        # If existing student exists for this slot, preserve name and profile
        if student_idx < len(existing_student_list):
            old_s = existing_student_list[student_idx]
            s_name = old_s["name"]
            s_email = old_s["email"]
            old_p = existing_profiles.get(old_s["id"], {})
        else:
            old_s = None
            old_p = None
            # Generate fresh unique name
            while True:
                fn = random.choice(first_names)
                ln = random.choice(last_names)
                candidate = f"{fn} {ln}"
                if candidate not in used_names:
                    used_names.add(candidate)
                    s_name = candidate
                    break
            slug = s_name.lower().replace(" ", ".")
            s_email = f"{slug}.{class_code}.{num:02d}@sman1ngoro.sch.id"

        used_names.add(s_name)
        used_emails.add(s_email)

        account = {
            "id": sid,
            "name": s_name,
            "role": "student",
            "email": s_email,
            "createdAt": "2026-08-10T07:30:00.000Z",
            "passwordHash": "$2b$10$mn55.a/zS9WNcjkXfiF/7.6Q4.dn1s9GRHm6r8hxMIEWRL43lDv.u",
        }
        all_student_accounts.append(account)

        # Profile with complete scores
        xp = random.randint(580, 1150)
        level = 2 if xp < 700 else (3 if xp < 1000 else 4)
        total_points = xp
        badges = ["first_quiz", "drill_master", "resilience_hero", "map_explorer"]
        if xp > 900:
            badges.append("evacuation_speedster")

        profile = {
            "userId": sid,
            "name": s_name,
            "gender": "female" if any(fn in s_name for fn in ["Anisa", "Citra", "Dewi", "Fitri", "Indah", "Putri", "Rina", "Sari", "Zahra", "Nabila", "Tiara", "Maya", "Anggun", "Salsabila", "Alya", "Dinda", "Salma", "Mega", "Ratna", "Intan", "Melati", "Widya", "Retno", "Desi", "Amalia", "Bella", "Gita"]) else "male",
            "grade": cgrade,
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
                {"type": "survey", "title": "Survei Kesiapsiagaan Bencana (Pre-Test)", "status": f"Selesai ({random.randint(40, 52)}/100)", "timestamp": "2026-08-18T08:15:00.000Z"},
                {"type": "quiz", "title": "Kuis: Mitigasi Gempa Bumi & Koridor Sekolah", "status": f"{random.randint(80, 95)}/100", "timestamp": "2026-08-25T09:40:00.000Z"},
                {"type": "simulation", "title": "Simulasi Digital Twin Gedung SMAN 1 Ngoro", "status": f"Berhasil (HP {random.randint(80, 95)}%)", "timestamp": "2026-09-08T10:20:00.000Z"},
                {"type": "learning", "title": "Modul Pembelajaran AI Mitigasi Cerdas", "status": "Tuntas", "timestamp": "2026-09-22T08:45:00.000Z"},
                {"type": "survey", "title": "Survei Peningkatan Resiliensi (Post-Test)", "status": f"Selesai ({random.randint(82, 94)}/100)", "timestamp": "2026-10-06T11:10:00.000Z"},
            ],
            "topicScores": {
                "Gempa Bumi": {"totalScore": 170, "averageScore": random.randint(82, 92), "totalAttempts": 2, "strongTopics": ["Drop, Cover, Hold On", "Rute Tangga Aman"]},
                "Banjir & Tsunami": {"totalScore": 160, "averageScore": random.randint(80, 90), "totalAttempts": 2, "strongTopics": ["Evakuasi Vertikal Lantai 2"]},
                "Evakuasi Mandiri": {"totalScore": 172, "averageScore": random.randint(84, 94), "totalAttempts": 2, "strongTopics": ["Titik Kumpul Lapangan Utama"]},
            },
            "pointsHistory": [
                {"date": "2026-08-18", "points": int(xp * 0.25)},
                {"date": "2026-08-25", "points": int(xp * 0.45)},
                {"date": "2026-09-08", "points": int(xp * 0.65)},
                {"date": "2026-09-22", "points": int(xp * 0.85)},
                {"date": "2026-10-06", "points": xp},
            ],
            "masteredConcepts": [
                "Drop, Cover, Hold On",
                "Titik Kumpul Lapangan Utama SMAN 1 Ngoro",
                "Rute Evakuasi Koridor Bebas Hambatan",
                "Pertolongan Pertama P3K",
            ],
            "lastUpdated": "2026-10-06T11:10:00.000Z",
        }
        all_student_profiles.append(profile)

        # Check if student already has quizHistories, if not add
        has_quiz = any(q.get("userId") == sid for q in all_quiz_histories)
        if not has_quiz:
            all_quiz_histories.append({
                "id": f"qh-{sid}-gempa",
                "userId": sid,
                "score": random.randint(80, 96),
                "topicId": "gempa-bumi",
                "createdAt": "2026-08-25T09:40:00.000Z",
                "questions": [
                    {"id": "q1", "text": "Apa tindakan pertama saat terjadi gempa di kelas?", "category": "Gempa Bumi"},
                    {"id": "q2", "text": "Di manakah lokasi Titik Kumpul teraman SMAN 1 Ngoro?", "category": "Evakuasi Lapangan"},
                ],
                "evaluations": [
                    {"questionId": "q1", "isCorrect": True, "feedback": "Sangat tepat: Drop, Cover, Hold On."},
                    {"questionId": "q2", "isCorrect": True, "feedback": "Tepat: Lapangan Utama SMAN 1 Ngoro."},
                ],
            })

        # Check if student already has dtResults, if not add
        has_dt = any(r.get("userId") == sid for r in all_dt_results)
        if not has_dt:
            all_dt_results.append({
                "id": f"dt-{sid}-run1",
                "userId": sid,
                "mapId": "sman1ngoro_digital_twin",
                "isSuccess": True,
                "timestamp": "2026-09-08T10:20:00.000Z",
                "damageTaken": random.randint(5, 20),
                "hpRemaining": random.randint(80, 95),
                "totalObjectives": 3,
                "objectivesCompleted": 3,
                "completionTimeSeconds": random.randint(11, 15),
            })

        student_idx += 1

print(f"Generated {len(all_student_accounts)} students across {len(classes)} classes.")

# Non-student accounts (teachers + dev)
non_students = [a for a in existing_accounts.values() if a.get("role") != "student"]
non_student_profiles = [p for p in existing_profiles.values() if p.get("role") != "student" and p.get("userId") not in [s["id"] for s in all_student_accounts]]

db["accounts"] = non_students + all_student_accounts
db["profiles"] = non_student_profiles + all_student_profiles
db["quizHistories"] = all_quiz_histories
db["dtResults"] = all_dt_results

with open(db_path, "w", encoding="utf-8") as f:
    json.dump(db, f, indent=2)

print(f"Saved {db_path}: {len(db['accounts'])} total accounts ({len(all_student_accounts)} students, {len(non_students)} teachers/dev).")
