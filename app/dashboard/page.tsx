"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import CreateMovementButton from "./movements/CreateButton";
import { useTankStore } from "@/src/store/tankStore";

type UserInfo = {
  id?: number;
  email?: string;
  nickname?: string;
  [key: string]: unknown;
};

export default function DashboardPage() {
  const router = useRouter();
  const { statuses, updatedAt, isLoading, errorMessage, fetchStatuses } = useTankStore();

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

  const handleLoadTankStatuses = async () => {
    await fetchStatuses();
  };

  useEffect(() => {
    if (!isClient || !token || !userInfo) {
      return;
    }

    void fetchStatuses();
  }, [fetchStatuses, isClient, token, userInfo]);

  const apiMessage = isLoading
    ? "タンク状態を取得中…"
    : errorMessage
    ? `取得エラー: ${errorMessage}`
    : statuses
    ? "タンク状態を更新しました"
    : "";

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
        onClick={handleLoadTankStatuses}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "green",
          color: "white",
          border: "none",
          borderRadius: 4,
        }}
      >
        タンク状態を取得する
      </button>

      <p style={{ marginTop: 10 }}>{apiMessage}</p>

      <section style={{ marginTop: 20 }}>
        <h2>Tank Statuses</h2>
        <p>更新時刻: {updatedAt ?? "-"}</p>

        {statuses ? (
          <ul>
            <li>Available: {statuses.Available.join(", ") || "なし"}</li>
            <li>InUse: {statuses.InUse.join(", ") || "なし"}</li>
            <li>Retrieved: {statuses.Retrieved.join(", ") || "なし"}</li>
            <li>ToBeDiscarded: {statuses.ToBeDiscarded.join(", ") || "なし"}</li>
            <li>Discarded: {statuses.Discarded.join(", ") || "なし"}</li>
          </ul>
        ) : (
          <p>まだデータがありません。</p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Movements 操作</h2>
        <CreateMovementButton />
      </section>
    </div>
  );
}
