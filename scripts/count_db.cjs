import("./repository.js").then(async (m) => {
  try {
    const classCount = (await m.pool.query("SELECT COUNT(*) FROM classes"))
      .rows[0].count;
    const studentCount = (
      await m.pool.query(
        "SELECT COUNT(*) FROM accounts WHERE data->>'role' = 'student'",
      )
    ).rows[0].count;
    console.log(`Classes: ${classCount}`);
    console.log(`Students: ${studentCount}`);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
});
