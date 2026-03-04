"use client";

import { useState } from "react";
import { Check, Copy, User, Bot } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const formattedTime = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className={`flex gap-3 group ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${isUser
            ? "bg-gradient-to-br from-brand-500 to-brand-700"
            : "bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-600"
          }`}
      >
        {isUser ? (
          <User size={15} className="text-white" />
        ) : (
          <Bot size={15} className="text-slate-300" />
        )}
      </div>

      {/* Bubble */}
      <div className={`relative max-w-[78%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
            ${isUser
              ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-br-sm"
              : "bg-[#1a1d2e] border border-[#2d3258] text-slate-200 rounded-bl-sm"
            }
            ${message.streaming ? "streaming-cursor" : ""}
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}

          {message.aborted && (
            <p className="text-xs text-slate-500 mt-1 italic">— generation stopped</p>
          )}
        </div>

        {/* Meta row: timestamp + copy */}
        <div className={`flex items-center gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-[10px] text-slate-600">{formattedTime}</span>

          {!isUser && message.content && !message.streaming && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300 p-1 rounded"
              title="Copy response"
            >
              {copied ? (
                <Check size={12} className="text-green-400" />
              ) : (
                <Copy size={12} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}