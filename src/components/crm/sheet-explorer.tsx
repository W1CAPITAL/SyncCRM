"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { 
  LayoutDashboard, Clock, LogOut, BarChart3, Settings, Search, Layers,
  MessageSquare, FileText, Loader2, UserCircle, Database, Zap, Briefcase, Cpu, UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { calculateV51Metrics } from "@/lib/metrics-engine";

const OmniReportView = dynamic(() => import("./omni-report-view").then(mod => mod.OmniReportView), { ssr: false });
const AiChatView = dynamic(() => import("./ai-chat").then(mod => mod.AiChatView), { ssr: false });
const AuditView = dynamic(() => import("./audit-view").then(mod => mod.AuditView), { ssr: false });

import { DashboardView } from "./dashboard-view";
import { DeadlinesView } from "./deadlines-view";
import { ReportsView } from "./reports-view";
import { DocumentsView } from "./documents-view";

export interface SheetIndices {
  lawyer: number;
  office: number;
  status: number;
  client: number;
  process: number;
  suspended: number;
  nextDate: number; 
  lastReturn: number; 
  phone: number;
}

const ALIASES = {
  client: ["cliente", "nome", "parte", "consumidor", "titular", "requerente", "autor"],
  process: ["processo", "cnj", "numero processo", "proc"],
  lawyer: ["advogado", "responsável", "responsavel", "analista", "atendente"],
  status: ["status", "situação", "situacao", "fase"],
  suspended: ["suspenso", "suspensão", "sobrestado"],
  office: ["escritório", "unidade", "comarca", "tribunal"],
  phone: ["telefone", "celular", "whats", "contato"],
  nextDate: ["próximo", "vencimento", "prazo"],
  lastReturn: ["retorno", "último retorno", "ultimo retorno"]
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
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return input.split('/')[0].split('?')[0].split('#')[0].trim();
}

export function SheetExplorer() {
  const { toast } = useToast();
  const [view, setView] = useState<'dashboard' | 'operations' | 'prazos' | 'reports' | 'docs' | 'settings' | 'omni' | 'chat' | 'audit'>('dashboard');
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [activeEngine, setActiveEngine] = useState<string>("openrouter");
  const [isSyncing, setIsSyncing] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [localRecords, setLocalRecords] = useState<any[]>([]);

  useEffect(() => {
    const savedId = localStorage.getItem('last_spreadsheet_id');
    const savedEngine = localStorage.getItem('crm_ai_engine') || "openrouter";
    setActiveEngine(savedEngine);
    if (savedId) {
      setSpreadsheetId(savedId);
      handleMirrorSheets(savedId);
    }
  }, []);

  const indices = useMemo((): SheetIndices => {
    if (!headers.length) return { lawyer: 0, office: 1, status: 2, client: 3, process: 5, suspended: 7, nextDate: -1, lastReturn: -1, phone: -1 };
    const lowerHeaders = headers.map(h => String(h).toLowerCase().trim());
    const findIdx = (aliases: string[]) => lowerHeaders.findIndex(h => aliases.some(alias => h === alias || h.includes(alias)));
    
    return {
      lawyer: findIdx(ALIASES.lawyer),
      office: findIdx(ALIASES.office),
      status: findIdx(ALIASES.status),
      client: findIdx(ALIASES.client),
      process: findIdx(ALIASES.process),
      suspended: findIdx(ALIASES.suspended),
      nextDate: findIdx(ALIASES.nextDate),
      lastReturn: findIdx(ALIASES.lastReturn),
      phone: findIdx(ALIASES.phone)
    };
  }, [headers]);

  const handleMirrorSheets = async (targetId?: string) => {
    const rawId = targetId || spreadsheetId;
    const idToUse = extractSheetId(rawId);
    
    if (!idToUse) {
       if (!targetId) toast({ variant: "destructive", title: "ID Ausente", description: "Informe a URL da planilha." });
       return;
    }

    setIsSyncing(true);
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${idToUse}/export?format=csv`;
      const res = await fetch(csvUrl, { cache: 'no-store' });
      
      if (!res.ok) {
        throw new Error("Erro de Acesso: Verifique se a planilha está compartilhada como 'Qualquer pessoa com o link pode ler'.");
      }
      
      const csvText = await res.text();
      const values = parseCSV(csvText);
      if (!values.length) throw new Error("Planilha vazia.");

      setHeaders(values[0]);
      const formattedRecords = values.slice(1).map((row, i) => {
        const dataObj: any = {};
        values[0].forEach((h, idx) => dataObj[`col_${idx}`] = row[idx] || "");
        return { id: `rec_${i}`, rowIndex: i, data: dataObj };
      });
      
      setLocalRecords(formattedRecords);
      localStorage.setItem('last_spreadsheet_id', idToUse);
      toast({ title: "Sincronização OK", description: "Dados extraídos da aba principal (CONTROLE)." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Falha de Sincronia", description: e.message });
    } finally { setIsSyncing(false); }
  };

  const updateEngine = (engine: string) => {
    setActiveEngine(engine);
    localStorage.setItem('crm_ai_engine', engine);
    toast({ title: "Motor IA Atualizado", description: `Utilizando agora: ${engine.toUpperCase()}` });
  };

  const metrics = useMemo(() => {
    const rawData = localRecords.map(r => r.data);
    return calculateV51Metrics(rawData, indices);
  }, [localRecords, indices]);

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full bg-zinc-50 overflow-hidden font-body text-black">
          <Sidebar className="bg-white text-black border-r border-zinc-200">
            <SidebarHeader className="p-6 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="bg-black p-2 rounded-lg shadow-lg">
                  <Layers className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="font-black text-black tracking-tighter uppercase text-sm block leading-none">SyncCRM</span>
                  <span className="text-[9px] text-black font-bold uppercase tracking-widest mt-1">W1 Capital Elite</span>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-4">
              <SidebarMenu className="space-y-1">
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                  { id: 'operations', icon: Briefcase, label: 'Carteira' },
                  { id: 'prazos', icon: Clock, label: 'Agenda' },
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
                        "flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all text-xs font-black uppercase tracking-wide group",
                        view === item.id ? "text-black bg-zinc-50" : "text-zinc-400 hover:text-black hover:bg-zinc-50"
                      )}
                    >
                      <div className="nav-icon-3d-wrapper">
                        <div className={cn("nav-icon-3d", view === item.id && "bg-black text-white shadow-xl shadow-black/20")}>
                          <item.icon className="h-4 w-4" />
                        </div>
                      </div>
                      <span className="ml-2">{item.label}</span>
                    </button>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-zinc-100">
              <button className="flex items-center gap-3 w-full p-2 text-black hover:text-red-600 transition-colors" onClick={() => { localStorage.removeItem('crm_auth_status'); window.location.reload(); }}>
                <LogOut className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Sair do Sistema</span>
              </button>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <header className="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0 shadow-sm z-50">
              <div className="flex items-center bg-zinc-100 rounded-xl px-4 py-2 w-96 border border-zinc-200">
                <Search size={14} className="text-black mr-2" />
                <input placeholder="Buscar CNJ, cliente, telefone..." className="bg-transparent border-none outline-none text-xs font-black w-full text-black placeholder:text-zinc-400" />
              </div>
              <div className="flex items-center gap-6">
                <Badge variant="outline" className="h-8 border-zinc-200 px-3 flex items-center gap-2 font-black text-[9px] text-black">
                   <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                   MODO ONLINE: {activeEngine.toUpperCase()}
                </Badge>
                <div className="flex items-center gap-3 text-black font-black text-xs uppercase tracking-tighter">
                  <div className="h-10 w-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg"><UserCircle size={24} /></div>
                  <div className="flex flex-col text-left">
                    <span>Diretoria de Operações</span>
                    <span className="text-[8px] text-zinc-500 font-black">Analista Sênior</span>
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 relative overflow-hidden flex flex-col bg-zinc-50">
              {view === 'settings' ? (
                <div className="h-full p-10 overflow-y-auto">
                  <div className="max-w-2xl mx-auto space-y-10">
                    <div>
                      <h1 className="text-3xl font-black text-black uppercase tracking-tighter">Configurações Neural</h1>
                      <p className="text-[10px] text-black font-bold uppercase tracking-widest mt-1">Gestão de Motores e Sincronização V53 Elite</p>
                    </div>

                    <div className="space-y-6">
                      <section className="bg-white p-8 rounded-3xl border-2 border-zinc-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-black text-white rounded-2xl shadow-lg"><Database className="h-5 w-5" /></div>
                          <div>
                            <h3 className="text-sm font-black uppercase text-black">Vínculo de Dados</h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase">ID do Google Sheets (CONTROLE)</p>
                          </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t">
                          <Input value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} placeholder="Cole a URL ou ID da planilha..." className="h-14 font-black text-xs border-2 text-black" />
                          <Button className="w-full h-14 bg-black text-white font-black hover:bg-zinc-900 shadow-xl transition-all" onClick={() => handleMirrorSheets()} disabled={isSyncing}>
                            {isSyncing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Zap className="h-5 w-5 mr-2" />}
                            SINCRONIZAR AGORA
                          </Button>
                        </div>
                      </section>

                      <section className="bg-white p-8 rounded-3xl border-2 border-zinc-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20"><Cpu className="h-5 w-5" /></div>
                          <div>
                            <h3 className="text-sm font-black uppercase text-black">Motor Estratégico AI</h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase">Escolha o cérebro neural para análise</p>
                          </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t">
                          <Select value={activeEngine} onValueChange={updateEngine}>
                            <SelectTrigger className="h-14 border-2 font-black text-[10px] uppercase text-black">
                              <SelectValue placeholder="Selecione o motor..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="openrouter" className="text-xs font-black uppercase">OpenRouter (Neural V53)</SelectItem>
                              <SelectItem value="grok" className="text-xs font-black uppercase">Grok xAI (Elite Realtime)</SelectItem>
                              <SelectItem value="local" className="text-xs font-black uppercase">Local Engine (Offline)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {view === 'dashboard' ? <DashboardView metrics={metrics} /> :
                   view === 'prazos' ? <DeadlinesView metrics={metrics} indices={indices} onEdit={() => {}} onWhatsApp={() => {}} /> :
                   view === 'reports' ? <ReportsView metrics={metrics} /> :
                   view === 'omni' ? <OmniReportView /> :
                   view === 'chat' ? <AiChatView /> :
                   view === 'audit' ? <AuditView metrics={metrics} /> :
                   view === 'docs' ? <DocumentsView data={metrics.activePortfolio} headers={headers} indices={indices} /> :
                   view === 'operations' ? (
                     <div className="h-full flex flex-col overflow-hidden">
                        <header className="p-8 bg-white border-b flex items-center justify-between shrink-0 shadow-sm">
                          <div>
                            <h2 className="text-xl font-black text-black uppercase tracking-tighter">Carteira Operacional</h2>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Dados Sincronizados da Aba Principal</p>
                          </div>
                          <Badge className="bg-black text-white px-5 py-2 font-black rounded-xl shadow-lg">{metrics.activePortfolio.length} ATIVOS</Badge>
                        </header>
                        <div className="flex-1 overflow-auto p-8">
                          <div className="bg-white rounded-3xl border-2 border-zinc-100 shadow-xl overflow-hidden">
                            <table className="w-full text-left border-collapse min-w-max">
                              <thead>
                                <tr className="bg-zinc-50 border-b-2">
                                  {headers.map((h, i) => <th key={i} className="p-5 text-[10px] font-black uppercase text-black border-r">{h}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {localRecords.map((row) => (
                                  <tr key={row.id} className="hover:bg-zinc-50 border-b text-xs font-black transition-colors">
                                    {headers.map((_, i) => <td key={i} className="p-5 border-r truncate max-w-[250px] text-black">{row.data[`col_${i}`]}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                     </div>
                   ) : null}
                </div>
              )}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}