"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ClipViewer() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [clip, setClip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchClip = async () => {
      try {
        const response = await fetch(`/api/clip/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Clip not found");
        setClip(data.clip);
        setTimeLeft(data.remainingMs);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchClip();
  }, [id]);

  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          clearInterval(timer);
          setError("This clip has expired");
          setClip(null);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (ms) => {
    if (!ms || ms <= 0) return "EXPIRED";
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const copyContent = async () => {
    if (!clip || clip.type !== "text") return;
    try {
      await navigator.clipboard.writeText(clip.content);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = clip.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (base64, fileName, fileType) => {
    const link = document.createElement("a");
    link.href = `data:${fileType};base64,${base64}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const isTextFile = (t) =>
    t &&
    (t.startsWith("text/") ||
      [
        "application/json",
        "application/xml",
        "application/sql",
        "application/x-yaml",
        "application/toml",
      ].includes(t));

  const getFileIcon = (t) => {
    if (!t) return "📄";
    if (t.startsWith("image/")) return "🖼️";
    if (t.startsWith("audio/")) return "🎵";
    if (t.startsWith("video/")) return "🎬";
    if (t.includes("pdf")) return "📕";
    if (t.includes("word") || t.includes("document")) return "📘";
    if (t.includes("excel") || t.includes("sheet")) return "📗";
    if (t.includes("powerpoint") || t.includes("presentation")) return "📙";
    if (t.includes("zip") || t.includes("rar") || t.includes("7z")) return "🗜️";
    if (t.startsWith("text/") || t.includes("json")) return "📝";
    return "📄";
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="animate-fade-in" style={{ textAlign: "center" }}>
          <div
            className="animate-pulse-slow"
            style={{ fontSize: "4rem", marginBottom: "16px" }}
          >
            🔄
          </div>
          <p style={{ fontSize: "1.25rem", color: "var(--secondary)" }}>
            Loading clip...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="card animate-fade-in"
          style={{
            textAlign: "center",
            maxWidth: "448px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "4rem" }}>
            {error.includes("expired") ? "⏰" : "❌"}
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "700" }}>
            {error.includes("expired") ? "Clip Expired" : "Clip Not Found"}
          </h1>
          <p style={{ color: "var(--secondary)", lineHeight: "1.6" }}>
            {error.includes("expired")
              ? "This clip has passed its 10-minute lifespan and has been permanently deleted."
              : "This clip does not exist or the link is invalid."}
          </p>
          <button onClick={() => router.push("/")} className="btn-primary">
            ← Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="animate-fade-in"
      style={{
        maxWidth: "672px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: "1.875rem",
            fontWeight: "700",
            marginBottom: "8px",
          }}
        >
          📋 Shared Clip
        </h1>
        <p style={{ color: "var(--secondary)" }}>
          This content was shared with you securely
        </p>
      </div>

      {timeLeft !== null && timeLeft > 0 && (
        <div className="card" style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "13px",
              color: "var(--secondary)",
              marginBottom: "4px",
            }}
          >
            ⏳ Auto-deletes in:
          </p>
          <p
            className="countdown"
            style={timeLeft < 60000 ? { color: "var(--error)" } : {}}
          >
            {formatTime(timeLeft)}
          </p>
          {timeLeft < 60000 && (
            <p
              className="animate-pulse-slow"
              style={{
                fontSize: "12px",
                color: "var(--error)",
                marginTop: "4px",
              }}
            >
              ⚠️ Less than 1 minute!
            </p>
          )}
        </div>
      )}

      <div
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        {/* Text */}
        {clip && clip.type === "text" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: "600" }}>📝 Text Content</span>
              <button
                onClick={copyContent}
                className="btn-secondary"
                style={{
                  padding: "6px 16px",
                  fontSize: "13px",
                  backgroundColor: copied ? "#dcfce7" : undefined,
                  color: copied ? "#166534" : undefined,
                }}
              >
                {copied ? "✅ Copied!" : "📋 Copy"}
              </button>
            </div>
            <div className="content-preview">
              <pre>{clip.content}</pre>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--secondary)",
                textAlign: "right",
              }}
            >
              {clip.content.length.toLocaleString()} characters
            </p>
          </>
        )}

        {/* Single File */}
        {clip && clip.type === "file" && (
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "4rem" }}>{getFileIcon(clip.fileType)}</div>
            <div>
              <p style={{ fontWeight: "600", fontSize: "1.125rem" }}>
                {clip.fileName}
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--secondary)",
                  marginTop: "4px",
                }}
              >
                {formatFileSize(clip.fileSize)} • {clip.fileType}
              </p>
            </div>
            {isTextFile(clip.fileType) && (
              <div
                className="content-preview"
                style={{ width: "100%", textAlign: "left", maxHeight: "256px" }}
              >
                <pre style={{ fontSize: "12px" }}>
                  {(() => {
                    try {
                      return atob(clip.content);
                    } catch {
                      return "[Unable to preview]";
                    }
                  })()}
                </pre>
              </div>
            )}
            <button
              onClick={() =>
                downloadFile(clip.content, clip.fileName, clip.fileType)
              }
              className="btn-primary"
            >
              ⬇️ Download File
            </button>
          </div>
        )}

        {/* Bulk Files */}
        {clip && clip.type === "bulk" && clip.files && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <p
              style={{
                fontWeight: "600",
                textAlign: "center",
                fontSize: "1.125rem",
              }}
            >
              📦 {clip.fileCount} Files
            </p>
            {clip.files.map((file, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  backgroundColor: "var(--input-bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontWeight: "500",
                      fontSize: "14px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getFileIcon(file.fileType)} {file.fileName}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--secondary)" }}>
                    {formatFileSize(file.fileSize)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    downloadFile(file.content, file.fileName, file.fileType)
                  }
                  className="btn-primary"
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    marginLeft: "8px",
                  }}
                >
                  ⬇️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center" }}>
        <button onClick={() => router.push("/")} className="link-subtle">
          ← Create your own clip
        </button>
      </div>
    </div>
  );
}
