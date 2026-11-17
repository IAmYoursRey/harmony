export type DifficultyLevel = "mudah" | "sedang" | "sulit";

export type SpabLevelNumber = 1 | 2 | 3 | 4;

export type LipiUnescoCategory =
  | "Sangat Siap"
  | "Siap"
  | "Hampir Siap"
  | "Kurang Siap"
  | "Belum Siap";

export interface SpabClassification {
  level: SpabLevelNumber;
  levelLabel: string;
  smabStageTitle: string;
  lipiCategory: LipiUnescoCategory;
  lipiCategoryEn: string;
  summary: string;
  badgeClasses: string;
  barColor: string;
  rangeLabel: string;
}

export interface RubricCriterionResult {
  id:
    | "safety_decision"
    | "hazard_awareness"
    | "indoor_discipline"
    | "response_agility";
  label: string;
  pillarRef: string;
  weightPercent: number;
  score: number;
  weightedPoints: number;
  detail: string;
}

export interface SimulationRubricInput {
  succeeded: boolean;
  timeMs: number;
  healthRemaining: number;
  maxHealth: number;
  trapsTriggered: number;
  totalTraps: number;
  indoorsTimeSec: number;
  difficulty: DifficultyLevel;
}

export interface SimulationRubricEvaluation {
  score: number;
  classification: SpabClassification;
  legacyGrade: "S" | "A" | "B" | "C" | "D";
  criteria: RubricCriterionResult[];
  references: {
    code: string;
    title: string;
  }[];
}

export const OFFICIAL_PREPAREDNESS_REFERENCES = [
  {
    code: "Richard R. Hake (1998)",
    title:
      "Normalized Learning Gain (<g> = 0.71, Kategori Tinggi): Evaluasi Efektivitas Pembelajaran Interaktif vs Ceramah Konvensional (Slide 13 PPT HARMONY)",
  },
  {
    code: "LIPI–UNESCO/ISDR (2006)",
    title:
      "Kajian Kesiapsiagaan Komunitas Sekolah (5 Parameter: Pengetahuan, Kebijakan, Rencana Darurat, Peringatan Dini, Mobilisasi; Skala 0–100)",
  },
  {
    code: "Perka BNPB No. 4/2012",
    title:
      "Pedoman Sekolah/Madrasah Aman dari Bencana (Tahap Tingkat Level 1–4 Kesiapsiagaan)",
  },
  {
    code: "Permendikbud No. 33/2019",
    title:
      "Penyelenggaraan Program Satuan Pendidikan Aman Bencana (SPAB 3 Pilar Nasional)",
  },
];

const DIFFICULTY_PAR_TIME_SEC: Record<DifficultyLevel, number> = {
  mudah: 75,
  sedang: 92,
  sulit: 112,
};

/**
 * Classifies a 0–100 index score against LIPI–UNESCO/ISDR (2006)
 * readiness thresholds and maps it to Perka BNPB No. 4/2012 Levels 1–4.
 */
export function classifySpabReadiness(score: number): SpabClassification {
  const safe = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));

  if (safe >= 80) {
    return {
      level: 4,
      levelLabel: "Level 4",
      smabStageTitle: "Optimal & Mandiri (Tingkat 4)",
      lipiCategory: "Sangat Siap",
      lipiCategoryEn: "Very Ready",
      rangeLabel: "80–100",
      summary:
        "Respons cepat, sadar bahaya ruang tertutup, dan konsisten mengikuti protokol evakuasi aman SPAB.",
      badgeClasses:
        "bg-emerald-500/20 text-emerald-300 border-emerald-400/60",
      barColor: "#10b981",
    };
  }

  if (safe >= 65) {
    return {
      level: 3,
      levelLabel: "Level 3",
      smabStageTitle: "Siap Terstruktur (Tingkat 3)",
      lipiCategory: "Siap",
      lipiCategoryEn: "Ready",
      rangeLabel: "65–79",
      summary:
        "Prosedur inti evakuasi berjalan efektif dan titik aman tercapai meski beberapa indikator masih bisa ditingkatkan.",
      badgeClasses: "bg-sky-500/20 text-sky-300 border-sky-400/60",
      barColor: "#0ea5e9",
    };
  }

  if (safe >= 55) {
    return {
      level: 2,
      levelLabel: "Level 2",
      smabStageTitle: "Tahap Berkembang (Tingkat 2)",
      lipiCategory: "Hampir Siap",
      lipiCategoryEn: "Almost Ready",
      rangeLabel: "55–64",
      summary:
        "Pemahaman awal sudah terbentuk, namun ketepatan rute aman, kecepatan tanggap, atau kewaspadaan rintangan belum konsisten.",
      badgeClasses: "bg-amber-500/20 text-amber-300 border-amber-400/60",
      barColor: "#f59e0b",
    };
  }

  if (safe >= 40) {
    return {
      level: 2,
      levelLabel: "Level 2",
      smabStageTitle: "Tahap Rintisan (Tingkat 2)",
      lipiCategory: "Kurang Siap",
      lipiCategoryEn: "Less Ready",
      rangeLabel: "40–54",
      summary:
        "Tindakan penyelamatan belum terstruktur atau terlalu lama berada di area berisiko sehingga membutuhkan latihan ulang.",
      badgeClasses: "bg-orange-500/20 text-orange-300 border-orange-400/60",
      barColor: "#f97316",
    };
  }

  return {
    level: 1,
    levelLabel: "Level 1",
    smabStageTitle: "Rintisan Awal (Tingkat 1)",
    lipiCategory: "Belum Siap",
    lipiCategoryEn: "Not Ready",
    rangeLabel: "0–39",
    summary:
      "Belum menerapkan langkah penyelamatan dasar SPAB; segera pelajari jalur keluar darurat dan titik aman bencana ini.",
    badgeClasses: "bg-rose-500/20 text-rose-300 border-rose-500/60",
    barColor: "#f43f5e",
  };
}

/**
 * Evaluates a simulation run using four transparent behavioral criteria
 * anchored to SPAB Pillars, LIPI–UNESCO parameters, and BNPB Levels 1–4.
 */
export function evaluateSimulationRubric(
  input: SimulationRubricInput,
): SimulationRubricEvaluation {
  const maxHp = Math.max(1, input.maxHealth || 100);
  const hpRatio = Math.max(0, Math.min(1, input.healthRemaining / maxHp));
  const totalTraps = Math.max(0, input.totalTraps);
  const trapsTriggered = Math.max(0, input.trapsTriggered);
  const parTimeSec = DIFFICULTY_PAR_TIME_SEC[input.difficulty] ?? 92;
  const timeSec = Math.max(0, input.timeMs / 1000);
  const indoorsSec = Math.max(0, input.indoorsTimeSec);

  const safetyDecisionScore = input.succeeded
    ? Math.round(58 + hpRatio * 42)
    : Math.round(hpRatio * 28);

  const awarenessScore =
    totalTraps > 0
      ? Math.round(
          (Math.max(0, totalTraps - trapsTriggered) / totalTraps) * 100,
        )
      : Math.round(hpRatio * 100);

  // Extended stay inside enclosed rooms elevates crush/smoke fatality risk.
  let indoorDisciplineScore = 100;
  if (indoorsSec > 6) {
    indoorDisciplineScore = Math.max(
      12,
      Math.round(100 - ((indoorsSec - 6) / 34) * 88),
    );
  }
  if (!input.succeeded) {
    indoorDisciplineScore = Math.min(indoorDisciplineScore, 55);
  }

  let agilityScore = 0;
  if (input.succeeded) {
    if (timeSec <= parTimeSec) {
      agilityScore = 100;
    } else {
      const overtimeRatio = Math.min(1, (timeSec - parTimeSec) / parTimeSec);
      agilityScore = Math.max(35, Math.round(100 - overtimeRatio * 65));
    }
  } else {
    agilityScore = Math.min(40, Math.round((timeSec / parTimeSec) * 35));
  }

  const criteria: RubricCriterionResult[] = [
    {
      id: "safety_decision",
      label: "Keputusan Titik Aman & Keselamatan Jiwa",
      pillarRef: "EP · SPAB Pilar 1–2",
      weightPercent: 35,
      score: safetyDecisionScore,
      weightedPoints: Math.round(safetyDecisionScore * 0.35),
      detail: input.succeeded
        ? `Titik aman tercapai dengan sisa kesehatan ${Math.round(hpRatio * 100)}%`
        : "Belum mencapai zona aman akhir skenario bencana",
    },
    {
      id: "hazard_awareness",
      label: "Kewaspadaan Rintangan & Deteksi Dini",
      pillarRef: "WS/KA · SPAB Pilar 3",
      weightPercent: 25,
      score: awarenessScore,
      weightedPoints: Math.round(awarenessScore * 0.25),
      detail:
        totalTraps > 0
          ? `Menghindari ${Math.max(0, totalTraps - trapsTriggered)} dari ${totalTraps} bahaya tersembunyi`
          : "Kondisi bahaya dinamis terhindari",
    },
    {
      id: "indoor_discipline",
      label: "Disiplin Evakuasi Ruang Tertutup",
      pillarRef: "PS/EP · Mitigasi Struktural",
      weightPercent: 20,
      score: indoorDisciplineScore,
      weightedPoints: Math.round(indoorDisciplineScore * 0.2),
      detail: `Durasi berada di ruang dalam: ${Math.round(indoorsSec)} detik`,
    },
    {
      id: "response_agility",
      label: "Ketangkasan Mobilisasi & Waktu Tanggap",
      pillarRef: "RMC · LIPI–UNESCO",
      weightPercent: 20,
      score: agilityScore,
      weightedPoints: Math.round(agilityScore * 0.2),
      detail: `Waktu ${Math.round(timeSec)}d vs acuan ${parTimeSec}d (${input.difficulty})`,
    },
  ];

  let compositeScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        safetyDecisionScore * 0.35 +
          awarenessScore * 0.25 +
          indoorDisciplineScore * 0.2 +
          agilityScore * 0.2,
      ),
    ),
  );

  // Reaching the verified disaster-safe refuge is mandatory before reaching Level 3 ("Siap").
  if (!input.succeeded) {
    compositeScore = Math.min(compositeScore, hpRatio > 0.2 ? 54 : 38);
  }

  const classification = classifySpabReadiness(compositeScore);

  let legacyGrade: "S" | "A" | "B" | "C" | "D" = "D";
  if (input.succeeded) {
    if (compositeScore >= 90) legacyGrade = "S";
    else if (compositeScore >= 80) legacyGrade = "A";
    else if (compositeScore >= 65) legacyGrade = "B";
    else legacyGrade = "C";
  }

  return {
    score: compositeScore,
    classification,
    legacyGrade,
    criteria,
    references: OFFICIAL_PREPAREDNESS_REFERENCES,
  };
}
