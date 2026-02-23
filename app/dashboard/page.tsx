"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import CreateMovementButton from "./movements/CreateButton";

type UserInfo = {
  id?: number;
  email?: string;
  nickname?: string;
  [key: string]: unknown;
};

export default function DashboardPage() {
  const router = useRouter();
  const [apiMessage, setApiMessage] = useState<string>("");

  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const redirectToLogin = useCallback(() => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    router.replace("/");
  }, [router]);

  const auth = useMemo(() => {
    if (!isClient) {
      return { token: null as string | null, userInfo: null as UserInfo | null };
    }

    const token = localStorage.getItem("jwt");
    const user = localStorage.getItem("user");

    if (!user) {
      return { token, userInfo: null as UserInfo | null };
    }

    try {
      return { token, userInfo: JSON.parse(user) as UserInfo };
    } catch {
      return { token, userInfo: null as UserInfo | null };
    }
  }, [isClient]);

  const { token, userInfo } = auth;

  useEffect(() => {
    if (!isClient) {
      return;
    }

    if (!token || !userInfo) {
      redirectToLogin();
    }
  }, [isClient, redirectToLogin, token, userInfo]);

  const handleLogout = () => {
    redirectToLogin();
  };

  const handleCallFlask = async () => {
    setApiMessage("Flask に問い合わせ中…");

    const token = localStorage.getItem("jwt");
    if (!token) {
      setApiMessage("JWT がありません（ログインし直してください）");
      return;
    }

    try {
      const res = await fetch("http://163.44.121.247:5000/api/ping", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        setApiMessage(`Flask エラー: ${res.status}`);
        return;
      }

      const json = await res.json();
      setApiMessage(`Flask 応答: ${JSON.stringify(json)}`);
    } catch {
      setApiMessage("Flask に接続できませんでした");
    }
  };

  if (!isClient || !userInfo) {
    return <p>読み込み中...</p>;
  }

  const displayName =
    userInfo.nickname ||
    userInfo.email ||
    `ユーザーID: ${userInfo.id ?? "不明"}`;

  return (
    <div style={{ padding: 20 }}>
      <h1>ダッシュボード</h1>

      <p>ログインに成功しています。</p>

      <p style={{ marginTop: 10 }}>
        ログイン中のユーザー：<strong>{displayName}</strong>
      </p>

      <button
        onClick={handleLogout}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "gray",
          color: "white",
          border: "none",
          borderRadius: 4,
        }}
      >
        ログアウト
      </button>

      <button
        onClick={handleCallFlask}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "green",
          color: "white",
          border: "none",
          borderRadius: 4,
        }}
      >
        Flask に問い合わせる
      </button>

      <p style={{ marginTop: 10 }}>{apiMessage}</p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Movements 操作</h2>
        <CreateMovementButton />
      </section>
    </div>
  );
}
