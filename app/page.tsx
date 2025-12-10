"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type MoodboardItem = {
  id: string;
  text: string;
  imageUrl?: string | null;
  color?: string | null;
  orderIndex?: number | null;
};

type Moodboard = {
  id: string;
  title: string;
  description?: string | null;
  items: MoodboardItem[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

type MoodboardPayload = {
  title: string;
  description: string;
  items: Array<{ text: string; color?: string; orderIndex?: number }>;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080/api/moodboards";

export default function Page() {
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [loading, setLoading] = useState(false);

  const statusColor = useMemo(
    () => (statusError ? "#dc2626" : "#2563eb"),
    [statusError],
  );

  useEffect(() => {
    void loadMoodboards();
  }, []);

  function setStatusMessage(message: string, isError = false) {
    setStatus(message);
    setStatusError(isError);
  }

  function serializeItems(): MoodboardPayload["items"] {
    return itemsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, index) => ({ text, orderIndex: index }));
  }

  async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        ...options,
      });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(message || res.statusText);
    }
    if (res.status === 204) {
      return null as T;
    }
    return (await res.json()) as T;
  }

  async function loadMoodboards() {
    try {
      setStatusMessage("목록을 불러오는 중...");
      const data = await fetchJson<Moodboard[]>(API_BASE);
      setMoodboards(data);
      setStatusMessage("");
    } catch (err) {
      setStatusMessage(`목록 조회 실패: ${(err as Error).message}`, true);
    }
  }

  async function loadToForm(id: string) {
    try {
      setStatusMessage("무드보드 불러오는 중...");
      const data = await fetchJson<Moodboard>(`${API_BASE}/${id}`);
      setEditingId(data.id);
      setTitle(data.title);
      setDescription(data.description ?? "");
      setItemsText((data.items ?? []).map((i) => i.text).join("\n"));
      setStatusMessage("불러왔습니다.");
    } catch (err) {
      setStatusMessage(`불러오기 실패: ${(err as Error).message}`, true);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload: MoodboardPayload = {
      title: title.trim(),
      description: description.trim(),
      items: serializeItems(),
    };

    if (!payload.title) {
      setStatusMessage("제목을 입력해주세요.", true);
      return;
    }

    try {
      setLoading(true);
      setStatusMessage(editingId ? "수정 중..." : "생성 중...");

      if (editingId) {
        await fetchJson(`${API_BASE}/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson(API_BASE, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setStatusMessage("완료되었습니다.");
      resetForm();
      await loadMoodboards();
    } catch (err) {
      setStatusMessage(`저장 실패: ${(err as Error).message}`, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    const confirmed = confirm("정말 삭제할까요?");
    if (!confirmed) return;
    try {
      setStatusMessage("삭제 중...");
      await fetchJson(`${API_BASE}/${editingId}`, { method: "DELETE" });
      resetForm();
      await loadMoodboards();
      setStatusMessage("삭제했습니다.");
    } catch (err) {
      setStatusMessage(`삭제 실패: ${(err as Error).message}`, true);
    }
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setItemsText("");
    setStatusMessage("");
  }

  function formatDate(value?: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  return (
    <main className="app">
      <header>
        <h1>무드보드 관리</h1>
        <p>백엔드: {API_BASE}</p>
      </header>

      <section className="form-section">
        <h2 id="form-title">{editingId ? "무드보드 수정" : "새 무드보드 만들기"}</h2>
        <form id="moodboard-form" onSubmit={handleSubmit}>
          <label>
            제목
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label>
            설명
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label>
            아이템 목록 (줄바꿈으로 구분)
            <textarea
              rows={4}
              placeholder={"예) 밝은 파란색 배경\n검정 타이포그래피"}
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
            />
          </label>
          <div className="actions">
            <button type="submit" id="submit-btn" disabled={loading}>
              {editingId ? "수정 저장" : "저장"}
            </button>
            <button type="button" className="secondary" onClick={resetForm}>
              초기화
            </button>
            <button
              type="button"
              className={`danger ${editingId ? "" : "hidden"}`}
              onClick={handleDelete}
            >
              삭제
            </button>
          </div>
          <p className="status" style={{ color: statusColor }}>
            {status}
          </p>
        </form>
      </section>

      <section className="list-section">
        <div className="list-header">
          <h2>무드보드 목록</h2>
          <button className="secondary" onClick={() => loadMoodboards()}>
            새로고침
          </button>
        </div>

        <div id="moodboard-list" className="list">
          {moodboards.length === 0 ? (
            <p>아직 무드보드가 없습니다.</p>
          ) : (
            moodboards.map((m) => (
              <div key={m.id} className="card">
                <div className="pill">#{m.id.slice(0, 6)}</div>
                <h3>{m.title}</h3>
                <p>{m.description}</p>
                <div>
                  {(m.items ?? []).map((item) => (
                    <span key={item.id} className="item-chip">
                      {item.color ? (
                        <span
                          className="color"
                          style={{ background: item.color }}
                        />
                      ) : null}
                      {item.text}
                    </span>
                  ))}
                </div>
                <div className="meta">
                  생성: {formatDate(m.createdAt)} | 수정: {formatDate(m.updatedAt)}
                </div>
                <div className="actions" style={{ marginTop: 10 }}>
                  <button
                    className="secondary"
                    onClick={() => loadToForm(m.id)}
                  >
                    불러오기
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

