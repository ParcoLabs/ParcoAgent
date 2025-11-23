import * as React from "react";
import { useNavigate } from "react-router-dom";

export default function AgentLayer() {
  const navigate = useNavigate();
  return (
    <button
      className="fixed z-[90] bottom-5 right-5 rounded-full shadow-lg border bg-white w-14 h-14 flex items-center justify-center text-lg"
      onClick={() => navigate("/agent")}
      title="Open Agent"
      aria-label="Open Agent"
    >
      🤖
    </button>
  );
}
