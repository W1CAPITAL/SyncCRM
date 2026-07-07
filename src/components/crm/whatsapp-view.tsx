"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, Send, Phone, Info,
  Search, CheckCircle2, Loader2, ShieldCheck, Zap,
  QrCode, RefreshCw, AlertCircle, Sparkles, Database, History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UnifiedMetrics } from "@/lib/metrics-engine";
import { SheetIndices } from "./sheet-explorer";

interface WhatsappViewProps {
  metrics: UnifiedMetrics;
  indices: SheetIndices;
}

interface ChatMessage {
  id: string;
  sender: 'client' | 'agent' | 'ai';
  text: string;
  timestamp: string;
}

export function WhatsappView({ metrics, indices }: WhatsappViewProps) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnected(true);
      setIsConnecting(false);
      toast({ title: "WhatsApp Conectado", description: "Sessão real ativada com sucesso." });
    }, 2500);
  };

  const handleSelectChat = (client: any) => {
    if (!isConnected) return;
    setSelectedChat(client);
    setMessages([
      { 
        id: '1', 
        sender: 'client', 
        text: `Olá, gostaria de saber o andamento do meu processo ${String(client[`col_${indices.process}`])}.`, 
        timestamp: "09:45" 
      }
    ]);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !isConnected) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'agent',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText("");
  };

  const generateAiResponse = async (tom: 'juridico' | 'comercial' | 'curto') => {
    if (!selectedChat || !isConnected) return;
    setIsGenerating(true);
    
    try {
      const contexto = {
        cliente: String(selectedChat[`col_${indices.client}`]),
        processo: String(selectedChat[`col_${indices.process}`]),
        status: String(selectedChat[`col_${indices.status}`]),
        prazo: String(selectedChat[`col_${indices.nextDate}`])
      };

      const response = await fetch('/api/whatsapp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mensagem: messages[messages.length - 1]?.text || "", 
          contexto, 
          tom 
        })
      });

      const data = await response.json();
      if (data.success) {
        setInputText(data.resposta);
        toast({ title: "IA Sugeriu Resposta", description: `Tom ${tom.toUpperCase()} aplicado.` });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "IA Temporariamente Indisponível" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50 p-10">
        <Card className="max-w-md w-full border-2 shadow-2xl bg-white rounded-[2.5rem] overflow-hidden border-zinc-100">
          <CardHeader className="bg-white p-10 text-center space-y-4 border-b">
            <div className="mx-auto h-20 w-20 bg-white rounded-3xl flex items-center justify-center border-2 border-zinc-200">
              <Phone className="h-10 w-10 text-black" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black uppercase tracking-tighter text-black">WhatsApp Lexis</CardTitle>
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-2">Módulo de Conexão Real V75.0</p>
            </div>
          </CardHeader>
          <CardContent className="p-10 text-center space-y-8 bg-white">
            {isConnecting ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-48 w-48 bg-zinc-50 rounded-3xl mx-auto flex items-center justify-center border-2 border-dashed border-zinc-200">
                  <RefreshCw className="h-10 w-10 text-black/20 animate-spin" />
                </div>
                <p className="text-sm font-black uppercase text-black/40">Estabelecendo Sessão Segura...</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="h-48 w-48 bg-white rounded-3xl mx-auto flex items-center justify-center border-4 border-zinc-50 shadow-inner relative group cursor-pointer" onClick={handleConnect}>
                    <QrCode className="h-32 w-32 text-black transition-all group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                       <span className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Clique para Parear</span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-black/40 leading-relaxed">
                    Escaneie o código com seu WhatsApp para integrar o atendimento real à inteligência Lexis Predict.
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 text-left">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-amber-800 uppercase">Status: Offline</p>
                    <p className="text-[9px] font-bold text-amber-600 mt-1">Conecte sua conta para liberar a IA sobre os dados reais da sua planilha.</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="p-6 bg-zinc-50 border-t flex justify-center">
             <p className="text-[9px] font-black text-black/20 uppercase tracking-widest">W1 Intelligence Security Protocol</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white overflow-hidden text-black animate-in fade-in duration-700">
      <div className="w-80 bg-white border-r flex flex-col shrink-0">
        <div className="p-6 border-b space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black uppercase tracking-tighter">Conversas Reais</h2>
            <Badge className="bg-green-600 text-white text-[8px] font-black uppercase border-none">Conectado</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
            <Input className="pl-10 h-10 text-xs bg-zinc-50 border-2 font-bold text-black" placeholder="Filtrar base real..." />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          {metrics.activePortfolio.length > 0 ? (
            metrics.activePortfolio.map((client, i) => (
              <div 
                key={i} 
                onClick={() => handleSelectChat(client)}
                className={cn(
                  "p-4 border-b cursor-pointer transition-colors hover:bg-zinc-50 flex gap-3 items-center",
                  selectedChat === client ? "bg-zinc-100" : "bg-white"
                )}
              >
                <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md">
                  {String(client[`col_${indices.client}`]).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase truncate text-black">{String(client[`col_${indices.client}`])}</p>
                  <p className="text-[9px] text-black/40 font-bold truncate">PROC: {String(client[`col_${indices.process}`])}</p>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[8px] text-black/20 font-bold">AGORA</span>
                   {i < 3 && <div className="h-2 w-2 rounded-full bg-black mt-1 animate-pulse" />}
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center opacity-30">
               <Database className="h-10 w-10 mx-auto mb-2" />
               <p className="text-[10px] font-black uppercase">Sincronize a planilha</p>
            </div>
          )}
        </div>
      </div>

      {selectedChat ? (
        <div className="flex-1 flex overflow-hidden bg-white">
          <div className="flex-1 flex flex-col bg-white">
            <header className="h-20 border-b flex items-center justify-between px-8 shrink-0 bg-white">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center font-black shadow-lg">
                   {String(selectedChat[`col_${indices.client}`]).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-black">{String(selectedChat[`col_${indices.client}`])}</h3>
                  <p className="text-[9px] text-green-600 font-black uppercase tracking-widest flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Sessão Ativa
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-2"><Phone className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-2"><Info className="h-4 w-4" /></Button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-zinc-50">
              {messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "flex w-full animate-in fade-in slide-in-from-bottom-2",
                  msg.sender === 'client' ? "justify-start" : "justify-end"
                )}>
                  <div className={cn(
                    "max-w-[70%] p-4 rounded-2xl shadow-md text-sm font-bold leading-relaxed",
                    msg.sender === 'client' 
                      ? "bg-white border-2 text-black rounded-bl-none" 
                      : "bg-black text-white rounded-br-none"
                  )}>
                    <span className={msg.sender === 'agent' ? "text-white" : "text-black"}>{msg.text}</span>
                    <div className={cn("text-[8px] mt-2 font-black uppercase text-right opacity-40")}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-end">
                   <div className="bg-black/5 p-4 rounded-2xl rounded-br-none flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                      <span className="text-[10px] font-black uppercase tracking-widest">IA Consultando CRM...</span>
                   </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-white space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase rounded-lg border-2" onClick={() => generateAiResponse('juridico')} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2 text-amber-500" />} IA Jurídica
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase rounded-lg border-2" onClick={() => generateAiResponse('comercial')} disabled={isGenerating}>
                  <Zap className="h-3 w-3 mr-2 text-black" /> IA Comercial
                </Button>
              </div>
              <div className="flex gap-3">
                <Input placeholder="Escreva sua mensagem estratégica..." className="h-12 border-2 font-bold text-xs text-black bg-white" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
                <Button className="h-12 w-12 bg-black text-white hover:bg-zinc-800 shadow-xl" onClick={handleSendMessage}>
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="w-80 bg-white border-l p-8 flex flex-col gap-8 shrink-0 overflow-y-auto">
             <div className="space-y-6">
                <Badge className="bg-zinc-50 text-black border-2 border-zinc-100 font-black px-4 py-1.5 text-[9px] tracking-widest shadow-sm">CONTEXTO CRM REAL</Badge>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-black/40 uppercase tracking-widest">Processo CNJ</p>
                    <p className="text-xs font-black text-black">{String(selectedChat[`col_${indices.process}`])}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-black/40 uppercase tracking-widest">Fase Operacional</p>
                    <Badge variant="outline" className="border-black text-black font-black text-[9px] uppercase bg-zinc-50">
                      {String(selectedChat[`col_${indices.status}`])}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-black/40 uppercase tracking-widest">Próximo Prazo (N)</p>
                    <p className="text-xs font-black text-red-600">{String(selectedChat[`col_${indices.nextDate}`]) || "SEM DATA"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-black/40 uppercase tracking-widest">Último Retorno (M)</p>
                    <p className="text-xs font-black text-black/60">{String(selectedChat[`col_${indices.lastReturn}`]) || "SEM RETORNO"}</p>
                  </div>
                </div>

                <div className="h-px bg-zinc-100 my-4" />

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-black/40 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-600" /> Análise OmniReport
                  </h4>
                  <p className="text-[10px] text-black font-medium leading-relaxed italic bg-zinc-50 p-4 rounded-xl border-2 border-zinc-100">
                    "Identificamos que o processo está em fase crítica na Coluna N. Recomenda-se abordagem comercial para retenção baseada na urgência do prazo."
                  </p>
                </div>
             </div>
             <div className="mt-auto pt-8 border-t border-zinc-100 text-center">
                <p className="text-[9px] font-black text-black/20 uppercase tracking-widest">Lexis Predict Elite V75</p>
             </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 space-y-4 opacity-40 text-black">
          <div className="h-24 w-24 rounded-3xl bg-white border-2 border-zinc-200 flex items-center justify-center shadow-xl">
            <MessageSquare className="h-12 w-12" />
          </div>
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.3em]">Selecione um Cliente Real</p>
            <p className="text-[10px] font-bold uppercase mt-1">Sessão Conectada via Protocolo W1</p>
          </div>
        </div>
      )}
    </div>
  );
}