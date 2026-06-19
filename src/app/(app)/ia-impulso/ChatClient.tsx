"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, User } from "lucide-react";

type Message = { role: "user" | "ai"; text: string };

const SUGGESTIONS = [
  "O que preciso corrigir hoje?",
  "Qual anúncio está com problema?",
  "Qual produto devo priorizar?",
  "Por que minha conversão caiu?",
  "Quem da equipe está produzindo menos?",
  "Quais SKUs tiveram envio errado?",
  "Onde estou perdendo dinheiro?",
];

export default function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Olá! Sou a IA Impulso. Posso analisar sua operação e responder perguntas estratégicas. O que você quer saber?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "ai", text: data.answer || "Não consegui processar a pergunta." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col card p-5 min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin space-y-4 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "ai" && (
              <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/15 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-[#FF6B00]" />
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm whitespace-pre-line ${
                m.role === "user" ? "bg-[#123C4A] text-[#F5F3EF]" : "bg-white/5 text-[#F5F3EF]/90"
              }`}
            >
              {m.text}
            </div>
            {m.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-[#123C4A]/60 flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/15 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-[#FF6B00]" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/5 text-sm text-[#F5F3EF]/50">Analisando dados...</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 my-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[#F5F3EF]/70 transition"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte algo sobre sua operação..."
          className="flex-1 px-4 py-3 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-3 rounded-xl bg-[#FF6B00] text-[#0F0F10] hover:bg-[#ff7d1f] transition disabled:opacity-60"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
