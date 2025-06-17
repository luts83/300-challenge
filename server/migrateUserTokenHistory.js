const mongoose = require("mongoose");
const UserTokenHistory = require("./models/UserTokenHistory");
const WritingStreak = require("./models/WritingStreak");

async function migrate() {
  await mongoose.connect(
    "mongodb+srv://admin_dio:digiocean2025@writing-challenge.ptfzoxh.mongodb.net/writing-challenge?retryWrites=true&w=majority&appName=writing-challenge"
  );

  await UserTokenHistory.updateMany(
    { "user.email": { $exists: false } },
    { $set: { "user.email": "unknown@email.com", "user.displayName": "익명" } }
  );
  await WritingStreak.updateMany(
    { "user.email": { $exists: false } },
    { $set: { "user.email": "unknown@email.com", "user.displayName": "익명" } }
  );

  console.log("Migration complete!");
  process.exit();
}

migrate();
