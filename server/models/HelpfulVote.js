// server/models/HelpfulVote.js
const mongoose = require('mongoose');

const helpfulVoteSchema = new mongoose.Schema(
    {
      submissionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Submission',
        required: true,
      },
      uid: {
        type: String,
        required: true,
      },
    },
    { timestamps: true }
  );
  
  // ✅ 하나의 유저는 동일한 글에 중복 투표 불가
  helpfulVoteSchema.index({ submissionId: 1, uid: 1 }, { unique: true });

module.exports = mongoose.model('HelpfulVote', helpfulVoteSchema);
