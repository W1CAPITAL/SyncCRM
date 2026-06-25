"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Send, Loader2, User, Bot, Trash2, Zap, Cpu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * Limpa artefatos de markdown no lado do cliente e normaliza o texto.
 */
function cleanClientString(val: string): string {
  if (!val) return "";
  return val.replace(/\*\*/g, '')
            .replace(/###/g, '')
            .replace(/##/g, '')
            .replace(/#/g, '')
            .replace(/---/g, '')
            .replace(/^[-*+]\s+/gm, '')
            .replace(/[`_]/g, '')
            .trim();
}

export function AiChatView() {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeEngine, setActiveEngine] = useState<string>("openrouter");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem('crm_chat_history');
    if (savedMessages) setMessages(JSON.parse(savedMessages));
    
    const engine = localStorage.getItem('crm_ai_engine') || "openrouter";
    setActiveEngine(engine);
  }, []);

  useEffect(() => {
    localStorage.setItem('crm_chat_history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mensagem: input, 
          historico: messages.slice(-10),
          engine: activeEngine 
        })
      });

      if (!response.ok) throw new Error("Falha na comunicação com o servidor.");

      const data = await response.json();

      if (data.success) {
        if (data.mode === 'client_handoff' && activeEngine === 'grok') {
          const { puter } = await import('@heyputer/puter.js');
          
          const prompt = `AJA COMO: Diretor de Operações Jurídicas de Elite. 
          Mensagem: "${input}". 
          Histórico: ${JSON.stringify(messages.slice(-10))}.
          PROIBIDO USAR MARKDOWN (negritos, listas). Responda em parágrafos de texto limpo e profissional.`;
          
          const responsePuter = await puter.ai.chat(prompt, { model: 'x-ai/grok-4.3' });
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: cleanClientString(responsePuter.message.content),
            timestamp: Date.now()
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.resposta,
            timestamp: Date.now()
          }]);
        }
      } else {
        toast({ variant: "destructive", title: "Erro na IA", description: data.error });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Falha de Conexão", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('crm_chat_history');
    toast({ title: "Histórico Limpo", description: "O chat estratégico foi resetado." });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b p-6 shadow-sm shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">Chat Estratégico</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Consultoria CRM & Legal Ops V50 Elite</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-zinc-200 bg-white font-black flex items-center gap-2">
            {activeEngine === 'local' ? <Cpu className="h-3 w-3" /> : activeEngine === 'grok' ? <Zap className="h-3 w-3" /> : <BrainCircuit className="h-3 w-3" />}
            {activeEngine.toUpperCase()}
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={clearChat}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-black">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <BrainCircuit className="h-16 w-16 text-zinc-300" />
            <div className="space-y-1">
              <p className="font-black uppercase text-xs tracking-widest">Diretoria de Operações</p>
              <p className="text-[10px] uppercase font-bold">Inicie sua consultoria estratégica aqui</p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={cn(
              "flex w-full animate-in fade-in slide-in-from-bottom-2",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}>
              <div className={cn(
                "max-w-[85%] p-5 rounded-2xl shadow-sm text-sm font-medium leading-relaxed whitespace-pre-wrap",
                msg.role === 'user' 
                  ? "bg-zinc-900 text-white rounded-br-none" 
                  : "bg-white border-2 text-zinc-800 rounded-bl-none"
              )}>
                <div className="flex items-center gap-2 mb-3 opacity-40">
                  {msg.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    {msg.role === 'user' ? 'Você' : 'Legal Ops Strategy'}
                  </span>
                </div>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white border-2 p-5 rounded-2xl rounded-bl-none">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            </div>
          </div>
        )}
      </div>

      <CardFooter className="p-6 bg-white border-t shrink-0">
        <div className="flex w-full gap-3">
          <Input 
            placeholder="Pergunte sobre estratégia, retenção ou prazos..." 
            className="h-14 border-2 font-bold text-xs" 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            disabled={isLoading}
          />
          <Button 
            className="h-14 w-14 bg-zinc-900 text-white hover:bg-zinc-800" 
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </CardFooter>
    </div>
  );
}
