"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("create");
  const [inputType, setInputType] = useState("text");
  const [textValue, setTextValue] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);

  const [retrieveCode, setRetrieveCode] = useState("");
  const [retrieveResult, setRetrieveResult] = useState(null);
  const [retrieveError, setRetrieveError] = useState("");
  const [retrieveLoading, setRetrieveLoading] = useState(false);
  const [retrieveTimeLeft, setRetrieveTimeLeft] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (!retrieveTimeLeft || retrieveTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setRetrieveTimeLeft((prev) => {
        if (prev <= 1000) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retrieveTimeLeft]);

  const formatTime = (ms) => {
    if (!ms || ms <= 0) return "EXPIRED";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setError("");
    }
  }, []);

  useEffect(() => {
    const handlePaste = (e) => {
      if (activeTab !== "create" || inputType !== "file") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            setSelectedFile(file);
            setError("");
            e.preventDefault();
            return;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeTab, inputType]);

  const handleCreate = async () => {
    setIsLoading(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      if (inputType === "text") {
        if (!textValue.trim()) {
          setError("Please enter some text");
          setIsLoading(false);
          return;
        }
        formData.append("type", "text");
        formData.append("content", textValue);
      } else {
        if (!selectedFile) {
          setError("Please select a file");
          setIsLoading(false);
          return;
        }
        formData.append("type", "file");
        formData.append("file", selectedFile);
      }

      const response = await fetch("/api/clip", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong");

      setResult({
        id: data.id,
        code: data.code,
        expiresAt: data.expiresAt,
        link: `${window.location.origin}/clip/${data.id}`,
      });
      setTimeLeft(data.expiresAt - Date.now());
      setTextValue("");
      setSelectedFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetrieve = async () => {
    setRetrieveLoading(true);
    setRetrieveError("");
    setRetrieveResult(null);
    try {
      const response = await fetch("/api/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: retrieveCode.trim() }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Invalid or expired code");

      setRetrieveResult({
        type: data.clip.type,
        content: data.clip.content,
        fileName: data.clip.fileName,
        fileType: data.clip.fileType,
        fileSize: data.clip.fileSize,
      });
      setRetrieveTimeLeft(data.remainingMs);
    } catch (err) {
      setRetrieveError(err.message);
    } finally {
      setRetrieveLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("✅ Copied!");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("✅ Copied!");
    }
  };

  const downloadFile = (base64, fileName, fileType) => {
    const link = document.createElement("a");
    link.href = `data:${fileType};base64,${base64}`;
    link.download = fileName;
    link.click();
  };

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: "32px" }}
    >
      {}
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: "700",
            marginBottom: "8px",
          }}
        >
          Secure Clipboard — Temporary Private Text & File Sharing
        </h1>

        <p
          style={{
            color: "var(--secondary)",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          Share text, code, and files securely with automatic deletion after 10
          minutes. No login required. No tracking. Fast and private sharing.
        </p>

        <p style={{ marginTop: "8px", fontSize: "14px", opacity: 0.7 }}>
          No signup required • Auto-delete • Max 700KB
        </p>
      </div>

      {}
      <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
        <button
          onClick={() => setActiveTab("create")}
          className={`tab-button ${activeTab === "create" ? "active" : "inactive"}`}
        >
          ✏️ Create Secure Clip
        </button>
        <button
          onClick={() => setActiveTab("retrieve")}
          className={`tab-button ${activeTab === "retrieve" ? "active" : "inactive"}`}
        >
          🔍 Retrieve
        </button>
      </div>

      {}
      {activeTab === "create" && (
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: "24px" }}
        >
          {}
          <div
            style={{ display: "flex", justifyContent: "center", gap: "16px" }}
          >
            <button
              onClick={() => setInputType("text")}
              className={`type-button ${inputType === "text" ? "active" : "inactive"}`}
            >
              📝 Text
            </button>
            <button
              onClick={() => setInputType("file")}
              className={`type-button ${inputType === "file" ? "active" : "inactive"}`}
            >
              📎 File
            </button>
          </div>

          {}
          {inputType === "text" && (
            <textarea
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Paste text for secure temporary sharing..."
              className="input-field"
              style={{ height: "192px", resize: "none" }}
              disabled={isLoading}
            />
          )}

          {}
          {inputType === "file" && (
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`drop-zone ${isDragging ? "active" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setSelectedFile(e.target.files[0]);
                    setError("");
                  }
                }}
                disabled={isLoading}
              />
              <div>
                <p style={{ fontSize: "2.5rem", marginBottom: "8px" }}>
                  {isDragging ? "📥" : selectedFile ? "✅" : "📁"}
                </p>
                <p style={{ fontWeight: "500" }}>
                  {selectedFile
                    ? selectedFile.name
                    : "Drag & drop or click to upload"}
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--secondary)",
                    marginTop: "4px",
                  }}
                >
                  Max 700KB • Text, code, PDF, documents only
                </p>
                {selectedFile && (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--secondary)",
                      marginTop: "4px",
                    }}
                  >
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
            </div>
          )}

          {}
          {error && (
            <div
              className="badge-error"
              style={{ textAlign: "center", display: "block" }}
            >
              {error}
            </div>
          )}

          {}
          <button
            onClick={handleCreate}
            disabled={isLoading}
            className="btn-primary"
            style={{ width: "100%" }}
          >
            {isLoading ? "🔄 Processing..." : "🚀 Generate Link"}
          </button>

          {}
          {result && (
            <div
              className="result-box success"
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {}
              <div>
                <p
                  style={{
                    fontWeight: "500",
                    marginBottom: "8px",
                    color: "var(--foreground)",
                  }}
                >
                  🔗 Share Link:
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={result.link}
                    readOnly
                    className="input-field"
                    style={{ fontSize: "14px" }}
                  />
                  <button
                    onClick={() => copyToClipboard(result.link)}
                    className="btn-secondary"
                    style={{ padding: "12px 16px", whiteSpace: "nowrap" }}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              {}
              <div>
                <p
                  style={{
                    fontWeight: "500",
                    marginBottom: "8px",
                    color: "var(--foreground)",
                  }}
                >
                  🔢 Retrieval Code:
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={result.code}
                    readOnly
                    className="input-field"
                    style={{
                      textAlign: "center",
                      fontFamily: "monospace",
                      fontSize: "1.25rem",
                      letterSpacing: "0.15em",
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(result.code)}
                    className="btn-secondary"
                    style={{ padding: "12px 16px", whiteSpace: "nowrap" }}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              {}
              {timeLeft !== null && timeLeft > 0 && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "13px", color: "var(--secondary)" }}>
                    ⏳ Expires in:
                  </p>
                  <p className="countdown">{formatTime(timeLeft)}</p>
                </div>
              )}

              {timeLeft !== null && timeLeft <= 0 && (
                <div style={{ textAlign: "center" }}>
                  <p className="badge-error">⏰ This clip has expired</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {}
      {activeTab === "retrieve" && (
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: "24px" }}
        >
          <div>
            <label
              style={{
                fontWeight: "500",
                display: "block",
                marginBottom: "8px",
                color: "var(--foreground)",
              }}
            >
              Enter Retrieval Code:
            </label>
            <input
              type="text"
              value={retrieveCode}
              onChange={(e) => setRetrieveCode(e.target.value.toUpperCase())}
              placeholder="e.g., X7K9P2"
              className="input-field"
              style={{
                textAlign: "center",
                fontFamily: "monospace",
                fontSize: "1.25rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
              maxLength={6}
              disabled={retrieveLoading}
            />
          </div>

          <button
            onClick={handleRetrieve}
            disabled={retrieveLoading || !retrieveCode.trim()}
            className="btn-primary"
            style={{ width: "100%" }}
          >
            {retrieveLoading ? "🔄 Fetching..." : "🔍 Retrieve"}
          </button>

          {retrieveError && (
            <div
              className="badge-error"
              style={{ textAlign: "center", display: "block" }}
            >
              {retrieveError}
            </div>
          )}

          {retrieveResult && (
            <div
              className="result-box info"
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {}
              {retrieveTimeLeft !== null && retrieveTimeLeft > 0 && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "13px", color: "var(--secondary)" }}>
                    ⏳ Expires in:
                  </p>
                  <p
                    className="countdown"
                    style={
                      retrieveTimeLeft < 60000 ? { color: "var(--error)" } : {}
                    }
                  >
                    {formatTime(retrieveTimeLeft)}
                  </p>
                </div>
              )}

              {}
              {retrieveResult.type === "text" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ fontWeight: "500" }}>📝 Text Content</span>
                    <button
                      onClick={() => copyToClipboard(retrieveResult.content)}
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "13px" }}
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div className="content-preview">
                    <pre>{retrieveResult.content}</pre>
                  </div>
                </div>
              )}

              {}
              {retrieveResult.type === "file" && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "3rem", marginBottom: "8px" }}>📄</p>
                  <p style={{ fontWeight: "500", fontSize: "1.1rem" }}>
                    {retrieveResult.fileName}
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--secondary)",
                      marginTop: "4px",
                    }}
                  >
                    {(retrieveResult.fileSize / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={() =>
                      downloadFile(
                        retrieveResult.content,
                        retrieveResult.fileName,
                        retrieveResult.fileType,
                      )
                    }
                    className="btn-primary"
                    style={{ marginTop: "16px" }}
                  >
                    ⬇️ Download File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {}
      <div
        style={{ maxWidth: "700px", margin: "40px auto", textAlign: "center" }}
      >
        <h2 style={{ marginBottom: "12px" }}>
          🔐 Secure Clipboard for Temporary File Sharing
        </h2>

        <p style={{ color: "var(--secondary)", marginBottom: "10px" }}>
          Secure Clipboard is a private pastebin alternative that lets you share
          text, code, and files with automatic deletion after 10 minutes.
        </p>

        <p style={{ color: "var(--secondary)" }}>
          Ideal for developers, students, and professionals who need fast,
          private, and temporary file sharing without leaving traces online.
        </p>
      </div>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            maxWidth: "700px",
            margin: "40px auto",
            textAlign: "center",
          }}
        >
          <h2>⚡ How it works</h2>

          <p style={{ color: "var(--secondary)" }}>
            1. Create a secure clipboard by adding text or uploading a file
          </p>
          <p style={{ color: "var(--secondary)" }}>
            2.Share the link or retrieval code
          </p>
          <p style={{ color: "var(--secondary)" }}>
            3. Your data automatically delete after 10 minutes
          </p>

          <p style={{ color: "var(--secondary)", marginTop: "10px" }}>
            No login, no storage, no tracking — just fast and private sharing.
          </p>
        </div>
        <a href="/admin" className="link-subtle">
          🔐 Admin Access
        </a>
      </div>
    </div>
  );
}
