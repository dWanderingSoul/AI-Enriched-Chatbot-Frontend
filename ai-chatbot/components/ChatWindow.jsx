"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";

const STREAM_URL = process.env.NEXT_PUBLIC_AGENT_STREAM_URL;
const INVOKE_URL = process.env.NEXT_PUBLIC_AGENT_INVOKE_URL;

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm your AI assistant powered by LangChain. How can I help you today? I can answer questions, write code, explain concepts, and much more.",
  timestamp: new Date().toISOString(),
};

export default function ChatWindow() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [useStreamMode, setUseStreamMode] = useState(true);
  const [error, setError] = useState(null);

  const bottomRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = useCallback(
    async (userInput) => {
      if (!userInput.trim() || isLoading) return;

      const userMessage = {
        id: uuidv4(),
        role: "user",
        content: userInput.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setIsStreaming(false);
      setError(null);

      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const assistantId = uuidv4();
      abortControllerRef.current = new AbortController();

      const requestBody = JSON.stringify({
        messages: [
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: userInput.trim() },
        ],
      });
      try {
        if (useStreamMode) {
          // ── STREAMING PATH ──────────────────────────────────────────
          const response = await fetch(STREAM_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
            signal: abortControllerRef.current.signal,
          });

          if (!response.ok) {
            throw new Error(`Stream error: ${response.status} ${response.statusText}`);
          }

          setIsStreaming(true);
          setIsLoading(false);

          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              role: "assistant",
              content: "",
              timestamp: new Date().toISOString(),
              streaming: true,
            },
          ]);

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const raw = line.slice(6).trim();
                if (raw === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(raw);
                  if (
                    parsed?.type === "content_block_delta" &&
                    parsed?.delta?.type === "text_delta"
                  ) {
                    accumulated += parsed.delta.text;
                  }
                } catch {
                 // accumulated += raw;
                }
              }
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: accumulated, streaming: true }
                  : m
              )
            );
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: accumulated || "I received your message.",
                    streaming: false,
                  }
                : m
            )
          );
          setIsStreaming(false);
        } else {
          // ── INVOKE PATH ─────────────────────────────────────────────
          const response = await fetch(INVOKE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
            signal: abortControllerRef.current.signal,
          });

          if (!response.ok) {
            throw new Error(`Invoke error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          const msgs = data?.output?.messages || [];
          const lastAI = [...msgs].reverse().find((m) => m.type === "ai");
          const content = lastAI?.content || data?.output?.output || data?.output || JSON.stringify(data);

          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              role: "assistant",
              content: String(content),
              timestamp: new Date().toISOString(),
              streaming: false,
            },
          ]);
          setIsLoading(false);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, streaming: false, aborted: true }
                : m
            )
          );
        } else {
          setError(err.message || "Something went wrong. Please try again.");
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        }
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [messages, isLoading, useStreamMode]
  );

  const handleAbort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleClearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
  }, []);

  const messageCount = messages.length - 1;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e2230]">
        <span className="text-xs text-[#64748b]">
          {messageCount} message{messageCount !== 1 ? "s" : ""}
        </span>

        {/* Streaming toggle */}
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <div
            onClick={() => !isLoading && setUseStreamMode((v) => !v)}
            className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
              useStreamMode ? "bg-[#4f6ef7]" : "bg-slate-600"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                useStreamMode ? "left-4" : "left-0.5"
              }`}
            />
          </div>
          {useStreamMode ? "Streaming" : "Invoke"}
        </label>

        <button
          onClick={handleClearChat}
          className="text-xs text-[#64748b] hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-400/10"
        >
          Clear Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && !isStreaming && <TypingIndicator />}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl max-w-md text-center">
              <span className="font-medium">Error: </span>
              {error}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onAbort={handleAbort}
        isLoading={isLoading || isStreaming}
        isStreaming={isStreaming}
      />
    </div>
  );
}