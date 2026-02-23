"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // 🔥 JWT があれば自動で /dashboard に遷移
  useEffect(() => {
    const token = localStorage.getItem("jwt");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      return;
    }

    try {
      JSON.parse(user);
      router.replace("/dashboard");
    } catch {
      localStorage.removeItem("jwt");
      localStorage.removeItem("user");
    }
  }, [router]);

  const handleLogin = async () => {
    setMessage("ログイン中…");

    try {
      const res = await fetch("http://163.44.121.247:8080/api/auth:signIn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!json.data?.token) {
        setMessage("ログイン失敗：メールかパスワードが違います");
        return;
      }

      // JWT を localStorage に保存
      localStorage.setItem("jwt", json.data.token);
      localStorage.setItem("user", JSON.stringify(json.data.user));


      // 🔥 ログイン成功 → /dashboard に遷移
      router.replace("/dashboard");
    } catch {
      setMessage("通信エラーが発生しました");
    }
  
    
  
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>ログイン</h1>

      <div>
        <label>メールアドレス</label><br />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        />
      </div>

      <div>
        <label>パスワード</label><br />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        />
      </div>

      <button
        onClick={handleLogin}
        style={{
          padding: "10px 20px",
          background: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: 4,
        }}
      >
        ログイン
      </button>

      <p style={{ marginTop: 20 }}>{message}</p>
    </div>
  );
}
