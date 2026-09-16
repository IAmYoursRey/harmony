import("./repository.js").then(async (m) => {
  try {
    const res = await m.pool.query(
      "SELECT * FROM accounts WHERE data->>'email' = 'dev@harmony.app'",
    );
    console.log("Teachers in DB:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
