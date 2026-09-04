
"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { 
  LayoutDashboard, Clock, LogOut, BarChart3, Settings, Search, Layers,
  MessageSquare, Loader2, UserCircle, Database, Zap, Cpu, UserCheck, Phone, CheckCircle2, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { calculateV75Metrics, UnifiedMetrics } from "@/lib/metrics-engine";

const OmniReportView = dynamic(() => import("./omni-report-view").then(mod => mod.OmniReportView), { ssr: false });
const AiChatView = dynamic(() => import("./ai-chat").then(mod => mod.AiChatView), { ssr: false });
const AuditView = dynamic(() => import("./audit-view").then(mod => mod.AuditView), { ssr: false });
const WhatsappView = dynamic(() => import("./whatsapp-view").then(mod => mod.WhatsappView), { ssr: false });

import { DashboardView } from "./dashboard-view";
import { DeadlinesView } from "./deadlines-view";
import { ReportsView } from "./reports-view";

export interface SheetIndices {
  lawyer: number;
  status: number;
  client: number;
  process: number;
  nextDate: number; 
  lastReturn: number; 
  phone: number;
}

const ALIASES = {
  client: ["cliente", "nome", "parte"],
  process: ["processo", "cnj", "protocolo"],
  lawyer: ["advogado", "responsável", "responsavel", "assistente"],
  status: ["status", "situação", "situacao", "fase"],
  phone: ["telefone", "celular", "whats"],
  nextDate: ["próximo", "proximo", "vencimento", "prazo", "proximo_retorno", "proximo retorno"],
  lastReturn: ["retorno", "ultimo retorno", "último retorno", "ultimo_retorno"]
};

const parseCSV = (csvText: string) => {
  const result = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    if (inQuotes) {
      if (char === '"' && nextChar === '"') { cell += '"'; i++; }
      else if (char === '"') inQuotes = false;
      else cell += char;
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ',') { row.push(cell); cell = ''; }
      else if (char === '\n' || char === '\r') {
        if (cell || row.length > 0) { row.push(cell); result.push(row); }
        row = []; cell = '';
        if (char === '\r' && nextChar === '\n') i++;
      } else cell += char;
    }
  }
  if (cell || row.length > 0) { row.push(cell); result.push(row); }
  return result;
};

function extractSheetId(input: string): string {
  if (!input) return "";
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/);
  if (match) return match[1];
  return input.trim().split(/[/?#]/)[0];
}

type SyncStep = {
  id: number;
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
};

export function SheetExplorer() {
  const { toast } = useToast();
  const [view, setView] = useState<'dashboard' | 'prazos' | 'reports' | 'settings' | 'omni' | 'chat' | 'audit' | 'whatsapp'>('dashboard');
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [activeEngine, setActiveEngine] = useState<string>("openrouter");
  const [isNeuralEnabled, setIsNeuralEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSteps, setSyncSteps] = useState<SyncStep[]>([
    { id: 1, label: "Inicializando Protocolo Lexis...", status: 'pending' },
    { id: 2, label: "Extraindo Identidade da Planilha...", status: 'pending' },
    { id: 3, label: "Conectando ao Google BI Engine...", status: 'pending' },
    { id: 4, label: "Capturando Silo de Dados Brutos...", status: 'pending' },
    { id: 5, label: "Estruturando Operação (M vs N)...", status: 'pending' },
    { id: 6, label: "Processamento Neural Master...", status: 'pending' },
    { id: 7, label: "Validando Gabinete Elite...", status: 'pending' },
  ]);

  const [headers, setHeaders] = useState<string[]>([]);
  const [localRecords, setLocalRecords] = useState<any[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [writeBusy, setWriteBusy] = useState(false);
  const [neuralInsight, setNeuralInsight] = useState<string>("");
  const [aiMetrics, setAiMetrics] = useState<any>(null);

  useEffect(() => {
    fetch("/api/google/status")
      .then((r) => r.json())
      .then((j) => {
        setGoogleConnected(!!j.connected);
        setGoogleEmail(j.email || null);
      })
      .catch(() => {});
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("google") === "connected") {
        setGoogleConnected(true);
        toast({ title: "Google conectado", description: "Agora o CRM pode ler e gravar na planilha." });
        window.history.replaceState({}, "", window.location.pathname);
      }
      if (q.get("google") === "error") {
        toast({ variant: "destructive", title: "Google OAuth", description: q.get("msg") || "erro" });
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch { /* */ }
    const savedId = localStorage.getItem('last_spreadsheet_id');
    const savedEngine = localStorage.getItem('crm_ai_engine') || "openrouter";
    const savedNeural = localStorage.getItem('crm_neural_mode') === 'true';
    
    setActiveEngine(savedEngine);
    setIsNeuralEnabled(savedNeural);
    
    if (savedId) {
      setSpreadsheetId(savedId);
      // Carregamento inicial silencioso ou com delay menor
      handleMirrorSheets(savedId, true);
    }
  }, []);

  const indices = useMemo((): SheetIndices => {
    if (!headers.length) return { lawyer: 0, status: 2, client: 3, process: 5, nextDate: -1, lastReturn: -1, phone: -1 };
    const lowerHeaders = headers.map(h => String(h).toLowerCase().trim());
    const findIdx = (aliases: string[]) => lowerHeaders.findIndex(h => aliases.some(alias => h === alias || h.includes(alias)));
    
    return {
      lawyer: findIdx(ALIASES.lawyer),
      status: findIdx(ALIASES.status),
      client: findIdx(ALIASES.client),
      process: findIdx(ALIASES.process),
      nextDate: findIdx(ALIASES.nextDate),
      lastReturn: findIdx(ALIASES.lastReturn),
      phone: findIdx(ALIASES.phone)
    };
  }, [headers]);

  const updateStep = (id: number, status: SyncStep['status']) => {
    setSyncSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleMirrorSheets = async (targetId?: string, isAuto = false) => {
    const rawId = targetId || spreadsheetId;
    const idToUse = extractSheetId(rawId);
    if (!idToUse) return;

    setIsSyncing(true);
    setNeuralInsight("");
    setAiMetrics(null);
    setSyncSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));

    try {
      // Passo 1: Inicialização
      updateStep(1, 'loading');
      await delay(800);
      updateStep(1, 'completed');

      // Passo 2: Extração
      updateStep(2, 'loading');
      await delay(600);
      if (!idToUse) throw new Error("ID Inválido");
      updateStep(2, 'completed');

      // Passo 3–5: Sheets API (OAuth) ou gviz público
      updateStep(3, 'loading');
      let values: string[][] = [];
      let viaOauth = false;

      if (googleConnected) {
        const apiRes = await fetch("/api/google/sheets/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spreadsheetId: idToUse }),
        });
        const apiJson = await apiRes.json();
        if (apiJson.ok && apiJson.values?.length) {
          values = apiJson.values;
          viaOauth = true;
        } else if (apiJson.needAuth) {
          setGoogleConnected(false);
        }
      }

      if (!values.length) {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${idToUse}/gviz/tq?tqx=out:csv&gid=0&headers=1&t=${Date.now()}`;
        const response = await fetch(gvizUrl, { method: "GET", cache: "no-store" });
        if (!response.ok) {
          throw new Error(
            googleConnected
              ? "Falha ao ler planilha (verifique se a conta tem acesso)."
              : "Planilha privada: clique em Conectar Google para ler e editar."
          );
        }
        values = parseCSV(await response.text());
      }
      if (!values.length) throw new Error("Planilha ilegível");
      updateStep(3, 'completed');
      updateStep(4, 'loading');
      await delay(200);
      updateStep(4, 'completed');
      updateStep(5, 'loading');
      setHeaders(values[0]);
      const records = values.slice(1).map((row, i) => {
        const dataObj: any = {};
        values[0].forEach((h, idx) => {
          dataObj[`col_${idx}`] = row[idx] || "";
          if (h) dataObj[h] = row[idx] || "";
        });
        return { id: `rec_${i}`, rowIndex: i, data: dataObj };
      });
      setLocalRecords(records);
      await delay(300);
      updateStep(5, 'completed');
      if (!isAuto) {
        toast({
          title: viaOauth ? "Planilha via Google (leitura+escrita)" : "Leitura pública (gviz)",
          description: viaOauth
            ? `${records.length} linhas · pode editar pelo CRM`
            : `${records.length} linhas · Conectar Google para gravar`,
        });
      }

      // Passo 6: Neural
      updateStep(6, 'loading');
      if (isNeuralEnabled || localStorage.getItem('crm_neural_mode') === 'true') {
        await performNeuralAnalysis(records.map(r => r.data));
        updateStep(6, 'completed');
      } else {
        await delay(500);
        updateStep(6, 'completed');
      }

      // Passo 7: Validação
      updateStep(7, 'loading');
      await delay(900);
      updateStep(7, 'completed');

      localStorage.setItem('last_spreadsheet_id', idToUse);
      if (!isAuto) {
        toast({ title: "Protocolo V85 Concluído", description: "Gabinete sincronizado com sucesso." });
      }
    } catch (e: any) {
      setSyncSteps(prev => prev.map(s => s.status === 'loading' ? { ...s, status: 'error' } : s));
      toast({ variant: "destructive", title: "Erro de Protocolo", description: e.message });
    } finally { 
      // Pequeno delay final para o usuário ler o status de "Concluído"
      await delay(500);
      setIsSyncing(false); 
    }
  };

  const performNeuralAnalysis = async (rawData: any[]) => {
    try {
      const res = await fetch('/api/neural-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rawData, 
          isFullNeural: true,
          engine: activeEngine 
        })
      });
      const data = await res.json();
      if (data.success && data.isFullNeural) {
        setAiMetrics(data.metrics);
        setNeuralInsight(data.metrics.analysis);
      }
    } catch (e) {
      console.error("Falha no processamento neural.");
    }
  };

  const resolveProto = (item: any) => {
    const d = item?.data || item || {};
    if (indices.process >= 0) return String(d[`col_${indices.process}`] || "").trim();
    return String(d.Protocolo || d.protocolo || d.Processo || "").trim();
  };

  const handleEdit = async (item: any, colIndex: number, newValue: string) => {
    const proto = resolveProto(item);
    if (!proto) {
      toast({ variant: "destructive", title: "Sem protocolo na linha" });
      return;
    }
    if (!googleConnected) {
      toast({
        variant: "destructive",
        title: "Conecte o Google",
        description: "Sem OAuth o CRM não grava na planilha.",
      });
      return;
    }
    const idToUse = extractSheetId(spreadsheetId);
    if (!idToUse) {
      toast({ variant: "destructive", title: "Informe o link/ID da planilha" });
      return;
    }
    setWriteBusy(true);
    try {
      setLocalRecords((prev) =>
        prev.map((r) => {
          if (r.id !== item.id && resolveProto(r) !== proto) return r;
          const data = { ...r.data, [`col_${colIndex}`]: newValue };
          if (headers[colIndex]) data[headers[colIndex]] = newValue;
          return { ...r, data };
        })
      );
      const headerName = headers[colIndex] || `col_${colIndex}`;
      const fields: Record<string, string> = { [headerName]: newValue };
      if (colIndex === indices.status) {
        fields.Status = newValue;
        fields.Situacao = newValue;
      }
      if (colIndex === indices.lastReturn) {
        fields.Retorno = newValue;
        fields.UltimoRetorno = newValue;
      }
      if (colIndex === indices.nextDate) {
        fields.Proximo_Retorno = newValue;
        fields.ProximoRetorno = newValue;
      }
      const res = await fetch("/api/google/sheets/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: idToUse, protocolo: proto, fields }),
      });
      const j = await res.json();
      if (!j.ok) {
        toast({ variant: "destructive", title: "Não gravou na planilha", description: j.error });
      } else {
        toast({ title: "Planilha atualizada", description: j.updated ? "Linha atualizada" : "Linha inserida" });
      }
    } finally {
      setWriteBusy(false);
    }
  };

  const handleAtender = async (item: any, status = "ATENDIDO") => {
    const proto = resolveProto(item);
    if (!proto) {
      toast({ variant: "destructive", title: "Sem protocolo" });
      return;
    }
    if (!googleConnected) {
      toast({ variant: "destructive", title: "Conecte o Google para gravar" });
      return;
    }
    const idToUse = extractSheetId(spreadsheetId);
    const hoje = new Date().toISOString().slice(0, 10);
    setWriteBusy(true);
    try {
      setLocalRecords((prev) =>
        prev.map((r) => {
          if (resolveProto(r) !== proto) return r;
          const data = { ...r.data };
          if (indices.lastReturn >= 0) {
            data[`col_${indices.lastReturn}`] = hoje;
            if (headers[indices.lastReturn]) data[headers[indices.lastReturn]] = hoje;
          }
          if (indices.status >= 0) {
            data[`col_${indices.status}`] = status;
            if (headers[indices.status]) data[headers[indices.status]] = status;
          }
          return { ...r, data };
        })
      );
      const res = await fetch("/api/google/sheets/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: idToUse,
          protocolo: proto,
          fields: {
            Retorno: hoje,
            UltimoRetorno: hoje,
            Status: status,
            Situacao: status,
            AtendidoPor: googleEmail || "SyncCRM",
          },
        }),
      });
      const j = await res.json();
      toast({
        title: j.ok ? "Atendimento gravado na planilha" : "Falha ao gravar",
        description: j.error || (j.updated ? "OK" : ""),
        variant: j.ok ? "default" : "destructive",
      });
    } finally {
      setWriteBusy(false);
    }
  };

  const metrics = useMemo((): UnifiedMetrics => {
    const rawData = localRecords.map(r => r.data);
    const local = calculateV75Metrics(rawData, indices);
    
    if (aiMetrics) {
      return {
        ...local,
        total: aiMetrics.totalAtivos || local.total,
        activePortfolio: local.activePortfolio,
        reallyOverdue: local.reallyOverdue,
        commonOverdue: local.commonOverdue,
        efficiencyScore: aiMetrics.efficiency || local.efficiencyScore,
        neuralAnalysis: aiMetrics.analysis,
        isAiGenerated: true
      };
    }
    
    return { ...local, neuralAnalysis: neuralInsight };
  }, [localRecords, indices, neuralInsight, aiMetrics]);

  const updateEngine = (engine: string) => {
    setActiveEngine(engine);
    localStorage.setItem('crm_ai_engine', engine);
  };

  const toggleNeural = (checked: boolean) => {
    setIsNeuralEnabled(checked);
    localStorage.setItem('crm_neural_mode', String(checked));
    if (checked && localRecords.length > 0) {
      handleMirrorSheets(spreadsheetId);
    } else {
      setNeuralInsight("");
      setAiMetrics(null);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full bg-white overflow-hidden text-black font-black">
          {/* Overlay de Sincronia Cadenciada */}
          {isSyncing && (
            <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-10 animate-in fade-in duration-500">
              <div className="max-w-md w-full space-y-8 text-center">
                <div className="mx-auto h-20 w-20 bg-black text-white rounded-3xl flex items-center justify-center shadow-2xl animate-pulse">
                  <Database className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Protocolo V85 Elite</h2>
                  <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-2">Sincronização de Gabinete em Tempo Real</p>
                </div>
                
                <div className="space-y-3 text-left bg-zinc-50 p-8 rounded-[2.5rem] border-2 border-zinc-100 shadow-inner">
                  {syncSteps.map((step) => (
                    <div key={step.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {step.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : 
                         step.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                         step.status === 'error' ? <ShieldAlert className="h-4 w-4 text-red-600" /> :
                         <div className="h-4 w-4 rounded-full border-2 border-zinc-200" />}
                        <span className={cn(
                          "text-[10px] uppercase font-black tracking-wide",
                          step.status === 'loading' ? "text-black" : 
                          step.status === 'completed' ? "text-black/60" :
                          step.status === 'error' ? "text-red-600" :
                          "text-black/20"
                        )}>{step.label}</span>
                      </div>
                      {step.status === 'completed' && <span className="text-[8px] font-bold text-green-600 uppercase">OK</span>}
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-col items-center gap-2">
                   <div className="h-1.5 w-48 bg-zinc-100 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-black animate-progress" />
                   </div>
                   <p className="text-[9px] text-black/40 uppercase font-black">Validando Integridade dos Silos</p>
                </div>
              </div>
            </div>
          )}

          <Sidebar className="bg-white border-r border-zinc-200">
            <SidebarHeader className="p-6 border-b border-zinc-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="bg-black p-2 rounded-lg shadow-lg">
                  <Layers className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="font-black text-black tracking-tighter uppercase text-sm block leading-none">Lexis Predict</span>
                  <span className="text-[9px] text-black font-bold uppercase tracking-widest mt-1">W1 Intelligence</span>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-4 bg-white">
              <SidebarMenu className="space-y-1">
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                  { id: 'whatsapp', icon: Phone, label: 'WhatsApp AI' },
                  { id: 'prazos', icon: Clock, label: 'Agenda (N)' },
                  { id: 'audit', icon: UserCheck, label: 'Auditoria' },
                  { id: 'reports', icon: BarChart3, label: 'BI Equipe' },
                  { id: 'chat', icon: MessageSquare, label: 'Chat IA' },
                  { id: 'omni', icon: Zap, label: 'OmniReport' },
                  { id: 'settings', icon: Settings, label: 'Ajustes' },
                ].map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <button 
                      onClick={() => setView(item.id as any)} 
                      className={cn(
                        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-wide",
                        view === item.id ? "text-black bg-zinc-50 shadow-sm" : "text-black/40 hover:text-black hover:bg-zinc-50"
                      )}
                    >
                      <div className="nav-icon-3d-wrapper">
                        <div className={cn("nav-icon-3d", view === item.id && "active-nav bg-black text-white")}>
                          <item.icon className="h-4 w-4" />
                        </div>
                      </div>
                      <span className="ml-2">{item.label}</span>
                    </button>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-zinc-100 bg-white">
              <button className="flex items-center gap-3 w-full p-2 text-black hover:text-red-600 transition-colors" onClick={() => { localStorage.removeItem('crm_auth_status'); window.location.reload(); }}>
                <LogOut className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Sair do Sistema</span>
              </button>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex flex-col flex-1 overflow-hidden bg-white">
            <header className="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0 z-50">
              <div className="flex items-center bg-zinc-50 rounded-xl px-4 py-2 w-96 border-2 border-zinc-100">
                <Search size={14} className="text-black mr-2" />
                <input placeholder="Busca estratégica Lexis..." className="bg-transparent border-none outline-none text-xs font-black w-full text-black placeholder:text-black/20" />
              </div>
              <div className="flex items-center gap-6">
                <Badge variant="outline" className="h-8 border-2 border-zinc-200 px-3 flex items-center gap-2 font-black text-[9px] text-black bg-zinc-50">
                   <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                   {activeEngine.toUpperCase()} {isNeuralEnabled && "+ NEURAL Master"}
                </Badge>
                <div className="flex items-center gap-3 text-black font-black text-xs uppercase tracking-tighter">
                  <div className="h-10 w-10 rounded-2xl bg-white border-2 border-zinc-100 text-black flex items-center justify-center shadow-lg"><UserCircle size={24} /></div>
                  <div className="flex flex-col text-left">
                    <span>Gabinete Elite</span>
                    <span className="text-[8px] text-black/40 font-black">V85 INTELLIGENCE</span>
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 relative overflow-hidden flex flex-col bg-white">
              <div className="h-full flex flex-col">
                {view === 'dashboard' ? <DashboardView metrics={metrics} /> :
                 view === 'whatsapp' ? <WhatsappView metrics={metrics} indices={indices} /> :
                 view === 'prazos' ? <DeadlinesView metrics={metrics} indices={indices} onEdit={(item, col, val) => handleEdit(item, col, val)} onWhatsApp={() => setView('whatsapp')} onAtender={(item) => handleAtender(item)} /> :
                 view === 'reports' ? <ReportsView metrics={metrics} /> :
                 view === 'omni' ? <OmniReportView /> :
                 view === 'chat' ? <AiChatView /> :
                 view === 'audit' ? <AuditView metrics={metrics} /> :
                 view === 'settings' ? (
                   <div className="h-full p-10 overflow-y-auto bg-white scroll-black">
                     <div className="max-w-2xl mx-auto space-y-10">
                       <h1 className="text-3xl font-black text-black uppercase tracking-tighter">Ajustes de Protocolo</h1>
                       <div className="space-y-6">
                         <section className="bg-white p-10 rounded-[2.5rem] border-2 border-zinc-100 shadow-xl space-y-8">
                           <div className="flex items-center gap-4">
                             <div className="p-4 bg-zinc-50 border-2 border-zinc-100 text-black rounded-3xl shadow-lg"><Database className="h-6 w-6" /></div>
                             <div><h3 className="text-lg font-black uppercase">Vínculo de Dados Silo</h3><p className="text-[10px] text-black/40 font-bold uppercase tracking-widest">Aba Principal (CONTROLE)</p></div>
                           </div>
                           <div className="space-y-4 pt-4 border-t-2">
                             <Input value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} placeholder="URL da planilha pública..." className="h-14 border-2 font-black text-xs text-black bg-zinc-50" />
                             <Button className="w-full h-16 bg-black text-white font-black hover:bg-zinc-900 shadow-2xl transition-all active:scale-[0.98]" onClick={() => handleMirrorSheets()} disabled={isSyncing}>
                               {isSyncing ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <Zap className="h-6 w-6 mr-3 text-amber-500" />} 
                               SINCRONIZAR PROTOCOLO V85
                             </Button>
                           </div>
                         </section>

                         <section className="bg-white p-10 rounded-[2.5rem] border-2 border-zinc-100 shadow-xl space-y-8">
                           <div className="flex items-center gap-4">
                             <div className="p-4 bg-zinc-50 border-2 border-zinc-100 text-black rounded-3xl shadow-lg"><Cpu className="h-6 w-6" /></div>
                             <div><h3 className="text-lg font-black uppercase">Motor Neural Master</h3><p className="text-[10px] text-black/40 font-bold uppercase tracking-widest">A IA assume a autoridade total dos silos</p></div>
                           </div>
                           <div className="pt-4 border-t-2 space-y-8">
                             <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border-2 border-zinc-100">
                               <div className="space-y-1">
                                 <Label className="text-sm font-black uppercase">Processamento Neural Master</Label>
                                 <p className="text-[10px] text-black/40 font-bold uppercase">A IA gera o Dashboard e Auditoria</p>
                               </div>
                               <Switch checked={isNeuralEnabled} onCheckedChange={toggleNeural} />
                             </div>
                             <div className="space-y-4">
                               <Label className="text-[10px] font-black uppercase text-black/40 ml-2">Escolha do Motor Cognitivo</Label>
                               <Select value={activeEngine} onValueChange={updateEngine}>
                                 <SelectTrigger className="h-16 border-2 font-black text-[11px] uppercase text-black bg-white rounded-3xl">
                                   <SelectValue placeholder="Selecione o motor..." />
                                 </SelectTrigger>
                                 <SelectContent className="bg-white border-2 rounded-3xl p-2">
                                   <SelectItem value="openrouter" className="text-xs font-black uppercase rounded-xl hover:bg-zinc-50">OpenRouter (GPT-4o Master)</SelectItem>
                                   <SelectItem value="grok" className="text-xs font-black uppercase rounded-xl hover:bg-zinc-50">Grok xAI (Realtime Elite)</SelectItem>
                                   <SelectItem value="local" className="text-xs font-black uppercase rounded-xl hover:bg-zinc-50">Local Brain V85</SelectItem>
                                 </SelectContent>
                               </Select>
                             </div>
                           </div>
                         </section>
                       </div>
                     </div>
                   </div>
                 ) : null}
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <style jsx global>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 8s linear infinite;
        }
        .scroll-black::-webkit-scrollbar {
          width: 6px;
        }
        .scroll-black::-webkit-scrollbar-thumb {
          background-color: #000000;
          border-radius: 10px;
        }
        .scroll-black::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </TooltipProvider>
  );
}

