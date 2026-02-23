"use client";

import { useState } from "react";
import { createMovement } from "../../actions/createMovement";

export default function CreateMovementButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    const token = localStorage.getItem("jwt");
    if (!token) {
      alert("ログインしてください");
      setLoading(false);
      return;
    }

    try {
      const result = await createMovement({
        fk_tanks: "B03",
        operation: "CheckOut",
        fk_customers: 1,
        token,
      });

      console.log("Movement created:", result);
      alert("Movements に登録しました！");
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
    >
      {loading ? "送信中..." : "B03 を持出として登録"}
    </button>
  );
}