"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [inputType, setInputType] = useState("text");
  const [textValue, setTextValue] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [sendError, setSendError] = useState("");

  const fileInputRef = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      setIsLoggedIn(true);
      setUsername("");
      setPassword("");
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
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
      setSendError("");
    }
  }, []);

  const handleSend = async () => {
    setIsSending(true);
    setSendError("");
    setSendResult("");

    try {
      const formData = new FormData();

      if (inputType === "text") {
        if (!textValue.trim()) {
          setSendError("Please enter some text");
          setIsSending(false);
          return;
        }
        formData.append("type", "text");
        formData.append("content", textValue);
      } else {
        if (!selectedFile) {
          setSendError("Please select a file");
          setIsSending(false);
          return;
        }
        formData.append("type", "file");
        formData.append("file", selectedFile);
      }

      const response = await fetch("/api/admin/send", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setIsLoggedIn(false);
          throw new Error("Session expired. Please login again.");
        }
        throw new Error(data.error || "Failed to send");
      }

      setSendResult(data.message || "✅ Sent to Telegram!");
      setTextValue("");
      setSelectedFile(null);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = () => {
    document.cookie =
      "admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setIsLoggedIn(false);
    router.push("/");
  };

  if (!isLoggedIn) {
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
            maxWidth: "448px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>🔐</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "700" }}>
              Admin Login
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "var(--secondary)",
                marginTop: "4px",
              }}
            >
              Authorized access only
            </p>
          </div>

          {}
          <form
            onSubmit={handleLogin}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "6px",
                  color: "var(--foreground)",
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter username"
                required
                disabled={loginLoading}
                autoComplete="username"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "6px",
                  color: "var(--foreground)",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter password"
                required
                disabled={loginLoading}
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <div
                className="badge-error"
                style={{ textAlign: "center", display: "block" }}
              >
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="btn-primary"
              style={{ width: "100%" }}
            >
              {loginLoading ? "🔄 Logging in..." : "🔑 Login"}
            </button>
          </form>

          {}
          <div style={{ textAlign: "center" }}>
            <button onClick={() => router.push("/")} className="link-subtle">
              ← Back to Home
            </button>
          </div>
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
      {}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700" }}>
            🛡️ Admin Dashboard
          </h1>
          <p
            style={{
              color: "var(--secondary)",
              fontSize: "14px",
              marginTop: "4px",
            }}
          >
            Send directly to Telegram • No data stored
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="btn-secondary"
          style={{ padding: "8px 16px", fontSize: "14px" }}
        >
          🚪 Logout
        </button>
      </div>

      {}
      <div className="result-box warning-box">
        <p style={{ fontSize: "14px", color: "var(--primary)" }}>
          ℹ️ <strong>Admin Mode:</strong> Content is sent directly to your
          Telegram. Nothing is stored on the server. No link or code is
          generated. Max file size: 4.5MB.
        </p>
      </div>

      {}
      <div
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: "24px" }}
      >
        {}
        <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
          <button
            onClick={() => setInputType("text")}
            className={`type-button ${inputType === "text" ? "active" : "inactive"}`}
            style={{ padding: "12px 24px", fontSize: "16px" }}
          >
            📝 Text
          </button>
          <button
            onClick={() => setInputType("file")}
            className={`type-button ${inputType === "file" ? "active" : "inactive"}`}
            style={{ padding: "12px 24px", fontSize: "16px" }}
          >
            📎 File
          </button>
        </div>

        {}
        {inputType === "text" && (
          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "8px",
                color: "var(--foreground)",
              }}
            >
              Message to send:
            </label>
            <textarea
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Type or paste your text here..."
              className="input-field"
              style={{ height: "192px", resize: "none" }}
              disabled={isSending}
            />
            <p
              style={{
                fontSize: "12px",
                color: "var(--secondary)",
                textAlign: "right",
                marginTop: "4px",
              }}
            >
              {textValue.length.toLocaleString()} characters
            </p>
          </div>
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
                  setSendError("");
                }
              }}
              disabled={isSending}
            />
            <div>
              <p style={{ fontSize: "3rem", marginBottom: "8px" }}>
                {isDragging ? "📥" : selectedFile ? "✅" : "📁"}
              </p>

              {selectedFile ? (
                <div>
                  <p style={{ fontWeight: "500", fontSize: "1rem" }}>
                    {selectedFile.name}
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--secondary)",
                      marginTop: "4px",
                    }}
                  >
                    {(selectedFile.size / 1024).toFixed(1)} KB
                    {selectedFile.size > 1024 * 1024 &&
                      ` (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)`}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    style={{
                      fontSize: "13px",
                      color: "var(--error)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                      marginTop: "8px",
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ fontWeight: "500" }}>
                    {isDragging
                      ? "Drop file here!"
                      : "Drag & drop or click to upload"}
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--secondary)",
                      marginTop: "4px",
                    }}
                  >
                    Max 4.5MB • All file types accepted
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {}
        {sendError && (
          <div className="result-box error-box" style={{ textAlign: "center" }}>
            <p style={{ color: "var(--error)" }}>{sendError}</p>
          </div>
        )}

        {}
        {sendResult && (
          <div className="result-box success" style={{ textAlign: "center" }}>
            <p style={{ color: "var(--success)", fontWeight: "500" }}>
              {sendResult}
            </p>
          </div>
        )}

        {}
        <button
          onClick={handleSend}
          disabled={isSending}
          className="btn-primary"
          style={{ width: "100%", fontSize: "1.125rem", padding: "16px" }}
        >
          {isSending ? "🔄 Sending to Telegram..." : "📤 Send to Telegram"}
        </button>
      </div>

      {}
      <div style={{ textAlign: "center" }}>
        <button onClick={() => router.push("/")} className="link-subtle">
          ← Back to Public Clipboard
        </button>
      </div>
    </div>
  );
}
