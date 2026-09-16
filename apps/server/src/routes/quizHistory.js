import express from "express";
import { readDB, writeDB, saveProfile } from "../repositories/repository.js";

const router = express.Router();

// POST /api/quiz-history - Save new quiz attempt
router.post("/", async (req, res) => {
  try {
    const { userId, topicId, questions, answers, evaluations, score } = req.body;
    if (!userId || !topicId || !questions || !answers || !evaluations) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await readDB();
    const histories = db.quizHistories || [];

    const history = {
      id: `qh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      topicId,
      questions,
      answers,
      evaluations,
      score,
      createdAt: new Date().toISOString()
    };

    histories.push(history);
    db.quizHistories = histories;

    // Award points and XP to student profile
    const pointsEarned = Math.max(10, Math.round((score || 0) * 0.5));
    const pIndex = (db.profiles || []).findIndex((p) => p.userId === userId);
    if (pIndex !== -1) {
      db.profiles[pIndex].totalPoints = (db.profiles[pIndex].totalPoints || 0) + pointsEarned;
      db.profiles[pIndex].xp = (db.profiles[pIndex].xp || 0) + pointsEarned;
      await saveProfile(db.profiles[pIndex]);
    }

    await writeDB({ quizHistories: db.quizHistories });

    res.json({
      success: true,
      history,
      pointsEarned,
      newTotalPoints: pIndex !== -1 ? db.profiles[pIndex].totalPoints : undefined,
    });
  } catch (error) {
    console.error("Error saving quiz history:", error);
    res.status(500).json({ error: "Failed to save quiz history" });
  }
});

// GET /api/quiz-history/student/:studentId - Get histories for a student
router.get("/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const db = await readDB();
    const histories = (db.quizHistories || []).filter(h => h.userId === studentId);
    res.json({ success: true, data: histories });
  } catch (error) {
    console.error("Error fetching quiz histories:", error);
    res.status(500).json({ error: "Failed to fetch quiz histories" });
  }
});

// GET /api/quiz-history/class/:classId - Get histories for a class
router.get("/class/:classId", async (req, res) => {
  try {
    const { classId } = req.params;
    const db = await readDB();
    const profiles = db.profiles || [];
    
    // Find all users in this class
    const userIds = profiles.filter(p => p.classId === classId).map(p => p.userId);
    
    // Get their histories
    const histories = (db.quizHistories || []).filter(h => userIds.includes(h.userId));
    
    res.json({ success: true, data: histories });
  } catch (error) {
    console.error("Error fetching class quiz histories:", error);
    res.status(500).json({ error: "Failed to fetch class quiz histories" });
  }
});

// PUT /api/quiz-history/:id/override - Override an AI evaluation
router.put("/:id/override", async (req, res) => {
  try {
    const { id } = req.params;
    const { questionId, isCorrect, pointsAdjustment } = req.body;
    
    const db = await readDB();
    const histories = db.quizHistories || [];
    
    const index = histories.findIndex(h => h.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "History not found" });
    }
    
    const history = histories[index];
    
    // Find evaluation
    const evalIndex = history.evaluations.findIndex(e => e.questionId === questionId);
    if (evalIndex !== -1) {
      history.evaluations[evalIndex].isCorrect = isCorrect;
      history.evaluations[evalIndex].overriddenByTeacher = true;
      
      // Adjust score locally in the history
      const oldScore = history.evaluations[evalIndex].score;
      history.evaluations[evalIndex].score = isCorrect ? 100 : 0;
      
      // Recompute total score
      const totalEvalScore = history.evaluations.reduce((sum, e) => sum + e.score, 0);
      history.score = Math.round(totalEvalScore / history.evaluations.length);
      
      db.quizHistories[index] = history;
      
      // Update student points in profile
      if (pointsAdjustment !== 0) {
        const pIndex = (db.profiles || []).findIndex(p => p.userId === history.userId);
        if (pIndex !== -1) {
          db.profiles[pIndex].totalPoints = (db.profiles[pIndex].totalPoints || 0) + pointsAdjustment;
        }
      }
      
      await writeDB(db);
      res.json({ success: true, history, newTotalPoints: db.profiles.find(p => p.userId === history.userId)?.totalPoints });
    } else {
      res.status(404).json({ error: "Evaluation not found" });
    }
  } catch (error) {
    console.error("Error overriding evaluation:", error);
    res.status(500).json({ error: "Failed to override evaluation" });
  }
});

export default router;
