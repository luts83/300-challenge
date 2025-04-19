import React, { useEffect, useState } from "react";
import axios from "axios";
import { useUser } from "../context/UserContext";

const FeedbackMissionPanel = () => {
  const { user } = useUser();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMissions = async () => {
      if (!user) return;
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/feedback-mission/${user.uid}`);
        setMissions(res.data);
      } catch (err) {
        console.error("미션 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMissions();
  }, [user]);

  if (!user || loading) return null;

  const remaining = missions.filter((m) => !m.isDone).length;

  return (
    <div className="bg-yellow-50 p-4 rounded shadow mb-6">
      <h2 className="text-lg font-bold mb-2">🧩 오늘의 피드백 미션</h2>

      {remaining === 0 ? (
        <p className="text-green-700 font-semibold">
          🎉 모든 피드백 미션을 완료했어요! 이제 받은 피드백을 확인할 수 있어요.
        </p>
      ) : (
        <ul className="space-y-3">
          {missions.map((mission, idx) => (
            <li key={idx} className="flex justify-between items-center bg-white p-2 rounded border">
              <p className="text-sm text-gray-700">
                글 미션 {idx + 1}: {mission.isDone ? "✅ 완료됨" : "🕒 미완료"}
              </p>
              {!mission.isDone && (
                <a
                  href={`/feedback/${mission.toSubmissionId}`}
                  className="text-blue-500 text-sm underline hover:text-blue-700"
                >
                  피드백 작성
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FeedbackMissionPanel;
