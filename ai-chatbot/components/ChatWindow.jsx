"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";

const AGENT_URL =
  process.env.NEXT_PUBLIC_AGENT_URL ||
  "https://ai4d.wiremockapi.cloud/agent/stream";

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
  const [error, setError] = useState(null);

  const bottomRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = useCallback(async (userInput) => {
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

    // Build conversation history for context
    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    const assistantId = uuidv4();

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(AGENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { input: userInput.trim() },
          config: {},
          kwargs: {},
          history,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      const isStreamResponse =
        contentType.includes("text/event-stream") ||
        contentType.includes("application/x-ndjson") ||
        contentType.includes("text/plain");

      if (isStreamResponse || response.body) {
        // Streaming path
        setIsStreaming(true);
        setIsLoading(false);

        // Add empty assistant message to populate
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

          // Handle SSE (text/event-stream) format
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const token =
                  parsed?.output?.output ||
                  parsed?.output ||
                  parsed?.content ||
                  parsed?.token ||
                  parsed?.text ||
                  (typeof parsed === "string" ? parsed : "");
                accumulated += token;
              } catch {
                // Plain text chunk
                accumulated += data;
              }
            } else if (line.trim() && !line.startsWith("event:") && !line.startsWith(":")) {
              // Non-SSE plain text
              try {
                const parsed = JSON.parse(line);
                const token =
                  parsed?.output?.output ||
                  parsed?.output ||
                  parsed?.content ||
                  parsed?.token ||
                  parsed?.text ||
                  (typeof parsed === "string" ? parsed : "");
                accumulated += token;
              } catch {
                accumulated += line;
              }
            }
          }

          // Update the streaming message in real time
          const current = accumulated;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: current, streaming: true }
                : m
            )
          );
        }

        // Finalize streaming message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: accumulated || "I received your message.", streaming: false }
              : m
          )
        );
        setIsStreaming(false);
      } else {
        // Non-streaming JSON fallback
        const data = await response.json();
        const content =
          data?.output?.output ||
          data?.output ||
          data?.content ||
          data?.response ||
          data?.text ||
          (typeof data === "string" ? data : JSON.stringify(data));

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
        // Aborted by user — finalize whatever we have
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, streaming: false, aborted: true }
              : m
          )
        );
      } else {
        setError(err.message || "Something went wrong. Please try again.");
        // Remove the empty assistant message if it exists
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [messages, isLoading]);

  const handleAbort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleClearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
  }, []);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e2230]">
        <span className="text-xs text-[#64748b]">
          {messages.length - 1} message{messages.length !== 2 ? "s" : ""}
        </span>
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
              <span className="font-medium">Error: </span>{error}
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