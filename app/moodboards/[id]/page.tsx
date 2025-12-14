"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { linkify } from "../../../lib/utils";

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
  dueDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Comment = {
  id: string;
  moodboardId: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
};

type Attachment = {
  id: string;
  moodboardId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080/api";

export default function MoodboardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [moodboard, setMoodboard] = useState<Moodboard | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 편집 모드 상태
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editItems, setEditItems] = useState<MoodboardItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [newItemColor, setNewItemColor] = useState("");

  useEffect(() => {
    void loadMoodboard();
    void loadComments();
    void loadAttachments();
  }, [id]);

  function setStatusMessage(message: string, isError = false) {
    setStatus(message);
    setStatusError(isError);
  }

  async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(options?.headers as HeadersInit),
      };
      
      const res = await fetch(url, {
        headers,
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
    } catch (error) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new Error(
          `서버에 연결할 수 없습니다. 백엔드 서버(${API_BASE})가 실행 중인지 확인해주세요.`
        );
      }
      throw error;
    }
  }

  async function loadMoodboard() {
    try {
      const data = await fetchJson<Moodboard>(`${API_BASE}/moodboards/${id}`);
      setMoodboard(data);
      if (data.dueDate) {
        setDueDate(data.dueDate);
      }
      setEditTitle(data.title);
      setEditDescription(data.description || "");
      setEditItems([...data.items]);
    } catch (err) {
      setStatusMessage(`무드보드 불러오기 실패: ${(err as Error).message}`, true);
    }
  }

  async function loadComments() {
    try {
      const data = await fetchJson<Comment[]>(
        `${API_BASE}/moodboards/${id}/comments`
      );
      setComments(data);
    } catch (err) {
      console.error("댓글 불러오기 실패:", err);
    }
  }

  async function loadAttachments() {
    try {
      const data = await fetchJson<Attachment[]>(
        `${API_BASE}/moodboards/${id}/attachments`
      );
      setAttachments(data);
    } catch (err) {
      console.error("첨부파일 불러오기 실패:", err);
    }
  }

  async function handleTitleSave() {
    if (!moodboard) return;
    try {
      setLoading(true);
      await fetchJson(`${API_BASE}/moodboards/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editTitle.trim(),
          description: moodboard.description || "",
          dueDate: moodboard.dueDate || null,
          items: moodboard.items || [],
        }),
      });
      await loadMoodboard();
      setIsEditingTitle(false);
      setStatusMessage("제목이 업데이트되었습니다.");
    } catch (err) {
      setStatusMessage(`제목 업데이트 실패: ${(err as Error).message}`, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDescriptionSave() {
    if (!moodboard) return;
    try {
      setLoading(true);
      await fetchJson(`${API_BASE}/moodboards/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: moodboard.title,
          description: editDescription.trim(),
          dueDate: moodboard.dueDate || null,
          items: moodboard.items || [],
        }),
      });
      await loadMoodboard();
      setIsEditingDescription(false);
      setStatusMessage("본문이 업데이트되었습니다.");
    } catch (err) {
      setStatusMessage(`본문 업데이트 실패: ${(err as Error).message}`, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleItemsSave() {
    if (!moodboard) return;
    try {
      setLoading(true);
      const itemsPayload = editItems.map((item, index) => ({
        text: item.text,
        color: item.color || undefined,
        orderIndex: index,
      }));
      
      await fetchJson(`${API_BASE}/moodboards/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: moodboard.title,
          description: moodboard.description || "",
          dueDate: moodboard.dueDate || null,
          items: itemsPayload,
        }),
      });
      await loadMoodboard();
      setIsEditingItems(false);
      setStatusMessage("아이템 목록이 업데이트되었습니다.");
    } catch (err) {
      setStatusMessage(`아이템 업데이트 실패: ${(err as Error).message}`, true);
    } finally {
      setLoading(false);
    }
  }

  function handleAddItem() {
    if (!newItemText.trim()) return;
    const newItem: MoodboardItem = {
      id: `temp-${Date.now()}`,
      text: newItemText.trim(),
      color: newItemColor || null,
      orderIndex: editItems.length,
    };
    setEditItems([...editItems, newItem]);
    setNewItemText("");
    setNewItemColor("");
  }

  function handleDeleteItem(itemId: string) {
    setEditItems(editItems.filter((item) => item.id !== itemId));
  }

  function handleMoveItemUp(index: number) {
    if (index === 0) return;
    const newItems = [...editItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setEditItems(newItems);
  }

  function handleMoveItemDown(index: number) {
    if (index === editItems.length - 1) return;
    const newItems = [...editItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setEditItems(newItems);
  }

  function handleItemTextChange(itemId: string, newText: string) {
    setEditItems(
      editItems.map((item) =>
        item.id === itemId ? { ...item, text: newText } : item
      )
    );
  }

  function handleItemColorChange(itemId: string, newColor: string) {
    setEditItems(
      editItems.map((item) =>
        item.id === itemId ? { ...item, color: newColor || null } : item
      )
    );
  }

  async function handleCommentSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!commentContent.trim()) {
      setStatusMessage("댓글 내용을 입력해주세요.", true);
      return;
    }

    try {
      setLoading(true);
      setStatusMessage("댓글 등록 중...");
      
      const url = `${API_BASE}/moodboards/${id}/comments`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: commentContent.trim(),
          author: commentAuthor.trim() || "익명",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
      }

      await loadComments();
      setCommentContent("");
      setCommentAuthor("");
      setStatusMessage("댓글이 등록되었습니다.");
    } catch (err) {
      console.error("댓글 등록 오류:", err);
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setStatusMessage(`댓글 등록 실패: ${errorMessage}`, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFile) {
      setStatusMessage("파일을 선택해주세요.", true);
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`${API_BASE}/moodboards/${id}/attachments`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("파일 업로드에 실패했습니다.");
      }

      setSelectedFile(null);
      await loadAttachments();
      setStatusMessage("파일이 업로드되었습니다.");
    } catch (err) {
      setStatusMessage(`파일 업로드 실패: ${(err as Error).message}`, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDueDateUpdate() {
    if (!moodboard) return;
    try {
      setLoading(true);
      await fetchJson(`${API_BASE}/moodboards/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: moodboard.title,
          description: moodboard.description || "",
          dueDate: dueDate || null,
          items: moodboard.items || [],
        }),
      });
      await loadMoodboard();
      setStatusMessage("기한이 업데이트되었습니다.");
    } catch (err) {
      setStatusMessage(`기한 업데이트 실패: ${(err as Error).message}`, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      await fetchJson(`${API_BASE}/moodboards/${id}/comments/${commentId}`, {
        method: "DELETE",
      });
      await loadComments();
      setStatusMessage("댓글이 삭제되었습니다.");
    } catch (err) {
      setStatusMessage(`댓글 삭제 실패: ${(err as Error).message}`, true);
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!confirm("첨부파일을 삭제하시겠습니까?")) return;
    try {
      await fetchJson(
        `${API_BASE}/moodboards/${id}/attachments/${attachmentId}`,
        {
          method: "DELETE",
        }
      );
      await loadAttachments();
      setStatusMessage("첨부파일이 삭제되었습니다.");
    } catch (err) {
      setStatusMessage(`첨부파일 삭제 실패: ${(err as Error).message}`, true);
    }
  }

  function formatDate(value?: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  if (!moodboard) {
    return (
      <main className="app">
        <p>로딩 중...</p>
      </main>
    );
  }

  const statusColor = statusError ? "#dc2626" : "#2563eb";

  return (
    <main className="issue-detail">
      <header className="issue-header">
        <button
          className="secondary"
          onClick={() => router.push("/")}
          style={{ marginBottom: "16px" }}
        >
          ← 목록으로
        </button>
        
        {isEditingTitle ? (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{
                flex: 1,
                padding: "12px",
                fontSize: "28px",
                fontWeight: "bold",
                border: "2px solid #2563eb",
                borderRadius: "8px",
              }}
              autoFocus
            />
            <button onClick={handleTitleSave} disabled={loading}>
              저장
            </button>
            <button
              className="secondary"
              onClick={() => {
                setEditTitle(moodboard.title);
                setIsEditingTitle(false);
              }}
            >
              취소
            </button>
          </div>
        ) : (
          <h1
            onClick={() => setIsEditingTitle(true)}
            style={{
              cursor: "pointer",
              margin: "0 0 8px",
              fontSize: "28px",
              padding: "8px",
              borderRadius: "8px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {moodboard.title}
          </h1>
        )}
      </header>

      <div className="issue-layout">
        {/* 메인 본문 영역 */}
        <div className="issue-main">
          <section className="issue-description">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2>설명</h2>
              {!isEditingDescription && (
                <button
                  className="secondary"
                  onClick={() => setIsEditingDescription(true)}
                  style={{ fontSize: "14px", padding: "6px 12px" }}
                >
                  편집
                </button>
              )}
            </div>

            {isEditingDescription ? (
              <div>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Markdown 형식으로 작성할 수 있습니다..."
                  style={{
                    width: "100%",
                    minHeight: "400px",
                    padding: "16px",
                    border: "2px solid #2563eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "monospace",
                    lineHeight: "1.6",
                  }}
                />
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button onClick={handleDescriptionSave} disabled={loading}>
                    저장
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      setEditDescription(moodboard.description || "");
                      setIsEditingDescription(false);
                    }}
                  >
                    취소
                  </button>
                </div>
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#6b7280" }}>
                  💡 Markdown 문법을 사용할 수 있습니다: **굵게**, *기울임*, `코드`, # 제목 등
                </div>
              </div>
            ) : (
              <div
                className="markdown-content"
                onClick={() => setIsEditingDescription(true)}
                style={{
                  minHeight: "200px",
                  padding: "20px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  background: "#ffffff",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#2563eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              >
                {moodboard.description ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {moodboard.description}
                  </ReactMarkdown>
                ) : (
                  <p style={{ color: "#9ca3af", fontStyle: "italic" }}>
                    설명이 없습니다. 클릭하여 추가하세요.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="issue-comments">
            <h2>댓글 ({comments.length})</h2>
            <form onSubmit={handleCommentSubmit} style={{ marginBottom: "24px" }}>
              <label>
                작성자 (선택)
                <input
                  type="text"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="익명"
                />
              </label>
              <label>
                댓글 내용
                <textarea
                  rows={3}
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={loading}>
                등록
              </button>
            </form>
            {comments.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: "16px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      background: "#fbfbfd",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <strong style={{ fontSize: "14px" }}>
                            {comment.author}
                          </strong>
                          <span style={{ fontSize: "12px", color: "#6b7280" }}>
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "14px", whiteSpace: "pre-wrap" }}>
                          {linkify(comment.content)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDeleteComment(comment.id)}
                        style={{ fontSize: "12px", padding: "6px 10px" }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* 사이드바 (PC 뷰) */}
        <aside className="issue-sidebar">
          <div className="sidebar-section">
            <h3>상세 정보</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                  생성일
                </div>
                <div style={{ fontSize: "14px" }}>
                  {formatDate(moodboard.createdAt)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                  수정일
                </div>
                <div style={{ fontSize: "14px" }}>
                  {formatDate(moodboard.updatedAt)}
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>기한</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <button
                type="button"
                onClick={handleDueDateUpdate}
                disabled={loading}
                style={{ fontSize: "14px", padding: "8px" }}
              >
                저장
              </button>
              {moodboard.dueDate && (
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                  현재: {formatDate(moodboard.dueDate)}
                </div>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3>아이템 목록 ({moodboard.items?.length || 0})</h3>
              {!isEditingItems ? (
                <button
                  className="secondary"
                  onClick={() => {
                    setEditItems([...moodboard.items]);
                    setIsEditingItems(true);
                  }}
                  style={{ fontSize: "12px", padding: "4px 8px" }}
                >
                  편집
                </button>
              ) : (
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    onClick={handleItemsSave}
                    disabled={loading}
                    style={{ fontSize: "12px", padding: "4px 8px" }}
                  >
                    저장
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      setEditItems([...moodboard.items]);
                      setIsEditingItems(false);
                    }}
                    style={{ fontSize: "12px", padding: "4px 8px" }}
                  >
                    취소
                  </button>
                </div>
              )}
            </div>

            {isEditingItems ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* 새 아이템 추가 */}
                <div style={{ padding: "12px", border: "2px dashed #d1d5db", borderRadius: "6px", background: "#f9fafb" }}>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="text"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder="아이템 텍스트"
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        fontSize: "13px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddItem();
                        }
                      }}
                    />
                    <input
                      type="color"
                      value={newItemColor || "#000000"}
                      onChange={(e) => setNewItemColor(e.target.value)}
                      style={{
                        width: "40px",
                        height: "32px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!newItemText.trim()}
                    style={{ fontSize: "12px", padding: "6px 12px", width: "100%" }}
                  >
                    추가
                  </button>
                </div>

                {/* 아이템 목록 편집 */}
                {editItems.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", padding: "16px" }}>
                    아이템이 없습니다. 위에서 추가하세요.
                  </p>
                ) : (
                  editItems.map((item, index) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "10px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        background: "#ffffff",
                      }}
                    >
                      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => handleItemTextChange(item.id, e.target.value)}
                          style={{
                            flex: 1,
                            padding: "6px 8px",
                            fontSize: "13px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                          }}
                        />
                        <input
                          type="color"
                          value={item.color || "#000000"}
                          onChange={(e) => handleItemColorChange(item.id, e.target.value)}
                          style={{
                            width: "40px",
                            height: "32px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => handleMoveItemUp(index)}
                          disabled={index === 0}
                          style={{ fontSize: "11px", padding: "4px 8px", flex: 1 }}
                        >
                          ↑ 위로
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => handleMoveItemDown(index)}
                          disabled={index === editItems.length - 1}
                          style={{ fontSize: "11px", padding: "4px 8px", flex: 1 }}
                        >
                          ↓ 아래로
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDeleteItem(item.id)}
                          style={{ fontSize: "11px", padding: "4px 8px", flex: 1 }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {moodboard.items && moodboard.items.length > 0 ? (
                  moodboard.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "8px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        background: "#fbfbfd",
                        fontSize: "13px",
                      }}
                    >
                      {item.color && (
                        <span
                          style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            borderRadius: "3px",
                            background: item.color,
                            marginRight: "6px",
                            verticalAlign: "middle",
                          }}
                        />
                      )}
                      {linkify(item.text)}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", padding: "16px" }}>
                    아이템이 없습니다.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <h3>첨부파일 ({attachments.length})</h3>
            <form onSubmit={handleFileUpload} style={{ marginBottom: "12px" }}>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                style={{ marginBottom: "8px", fontSize: "13px" }}
              />
              <button
                type="submit"
                disabled={loading || !selectedFile}
                style={{ fontSize: "13px", padding: "6px 12px", width: "100%" }}
              >
                업로드
              </button>
            </form>
            {attachments.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 8px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      background: "#fbfbfd",
                      fontSize: "12px",
                    }}
                  >
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#2563eb", textDecoration: "none", flex: 1 }}
                    >
                      {att.fileName}
                    </a>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDeleteAttachment(att.id)}
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      <p className="status" style={{ color: statusColor, marginTop: "16px" }}>
        {status}
      </p>
    </main>
  );
}
