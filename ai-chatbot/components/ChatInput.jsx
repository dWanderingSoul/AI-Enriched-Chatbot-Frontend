"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";

export default function ChatInput({ onSend, onAbort, isLoading, isStreaming }) {
  const [input, setInput] = useState("");
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-[#1e2230] bg-[#13151f] px-4 py-4">
      <div className="flex items-end gap-3 bg-[#1a1d2e] border border-[#2d3258] rounded-2xl px-4 py-3 focus-within:border-brand-500 transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={isLoading ? "AI is responding…" : "Message the AI agent… (Enter to send, Shift+Enter for newline)"}
          rows={1}
          className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 text-sm resize-none outline-none min-h-[24px] max-h-[160px] leading-6 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Abort or Send button */}
        {isStreaming ? (
          <button
            onClick={onAbort}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all flex items-center justify-center"
            title="Stop generation"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all flex items-center justify-center shadow-md"
            title="Send message"
          >
            <Send size={14} />
          </button>
        )}
      </div>

      <p className="text-center text-[10px] text-slate-600 mt-2">
        AI can make mistakes. Double-check important information.
      </p>
    </div>
  );
}