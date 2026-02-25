"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AUTH_SIGNIN_ENDPOINT =
  (process.env.NEXT_PUBLIC_AUTH_SIGNIN_ENDPOINT && process.env.NEXT_PUBLIC_AUTH_SIGNIN_ENDPOINT.trim()) ||
  "/auth/api/auth:signIn";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // 🔥 JWT があれば自動で /qr-register に遷移
  useEffect(() => {
    const token = localStorage.getItem("jwt");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      return;
    }

    try {
      JSON.parse(user);
      router.replace("/qr-register");
    } catch {
      localStorage.removeItem("jwt");
      localStorage.removeItem("user");
    }
  }, [router]);

  const handleLogin = async () => {
    setMessage("ログイン中…");

    try {
      const res = await fetch(AUTH_SIGNIN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setMessage(`ログインAPIエラー: ${res.status}${text ? ` ${text}` : ""}`);
        return;
      }

      const json = await res.json().catch(() => null as unknown);

      if (!json || typeof json !== "object") {
        setMessage("ログインAPIの応答形式が不正です");
        return;
      }

      if (!("data" in json) || !(json as { data?: { token?: string; user?: unknown } }).data?.token) {
        setMessage("ログイン失敗：メールかパスワードが違います");
        return;
      }

      const data = (json as { data: { token: string; user: unknown } }).data;

      // JWT を localStorage に保存
      localStorage.setItem("jwt", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));


      // 🔥 ログイン成功 → /qr-register に遷移
      router.replace("/qr-register");
    } catch {
      setMessage(`通信エラーが発生しました（接続先: ${AUTH_SIGNIN_ENDPOINT}）`);
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
