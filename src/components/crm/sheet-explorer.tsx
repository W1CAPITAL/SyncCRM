"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  LayoutDashboard, Clock, LogOut, FileSpreadsheet, 
  BarChart3, FileArchive, Settings, Search, Edit2, Layers,
  BrainCircuit, MessageSquare, FileText,
  Loader2, Sparkles, UserCircle, Database, PanelLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Importações dinâmicas para otimização de bundle e prevenção de erros de build
const DocGeneratorView = dynamic(() => import("./doc-generator-view").then(mod => mod.DocGeneratorView), {
  loading: () => <div className="flex-1 flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>,
  ssr: false
});

const OmniReportView = dynamic(() => import("./omni-report-view").then(mod => mod.OmniReportView), {
  ssr: false
});

const AiChatView = dynamic(() => import("./ai-chat").then(mod => mod.AiChatView), {
  ssr: false
});

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
  phone: number;
}

const ALIASES = {
  client: ["cliente", "nome", "parte", "consumidor", "titular", "requerente", "autor", "beneficiário"],
  process: ["processo", "cnj", "numero processo", "nº processo", "proc", "número", "numero", "protocolo", "id"],
  lawyer: ["advogado", "responsável", "responsavel", "analista", "líder", "operador", "atendente", "user", "colaborador"],
  status: ["status", "situação", "situacao", "fase", "andamento", "estado", "etapa", "decisão"],
  suspended: ["suspenso", "suspensão", "suspensao", "paralisado", "pausado", "sobrestado", "alerta", "parado"],
  office: ["escritório", "escritorio", "empresa", "parceiro", "unidade", "filial", "office", "tribunal", "comarca"],
  phone: ["telefone", "celular", "whats", "whatsapp", "fone", "contato", "mobile", "phone"]
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

export function SheetExplorer() {
  const { toast } = useToast();
  const [view, setView] = useState<'dashboard' | 'operations' | 'prazos' | 'reports' | 'docs' | 'settings' | 'omni' | 'chat' | 'docs_gen'>('dashboard');
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [aiEngine, setAiEngine] = useState<string>("openrouter");
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [localRecords, setLocalRecords] = useState<any[]>([]);

  useEffect(() => {
    const savedId = localStorage.getItem('last_spreadsheet_id');
    const savedHeaders = localStorage.getItem('last_headers');
    const savedEngine = localStorage.getItem('crm_ai_engine') || "openrouter";
    
    if (savedId) {
      setSpreadsheetId(savedId);
      handleMirrorSheets(savedId);
    }
    if (savedHeaders) setHeaders(JSON.parse(savedHeaders));
    setAiEngine(savedEngine);
  }, []);

  const indices = useMemo((): SheetIndices => {
    if (!headers.length) return { lawyer: 0, office: 1, status: 2, client: 3, process: 5, suspended: 7, nextDate: 0, phone: -1 };
    const lowerHeaders = headers.map(h => String(h).toLowerCase().trim());
    const findIdx = (aliases: string[]) => lowerHeaders.findIndex(h => aliases.some(alias => h === alias || h.includes(alias)));
    
    let dateIdx = lowerHeaders.findIndex(h => h === "próximo" || h === "prazo" || h === "vencimento");
    if (dateIdx === -1) dateIdx = lowerHeaders.findIndex(h => h.includes("próximo") || h.includes("prazo") || h.includes("vencimento"));
    if (dateIdx === -1) dateIdx = lowerHeaders.findIndex(h => h.includes("data"));

    return {
      lawyer: findIdx(ALIASES.lawyer),
      office: findIdx(ALIASES.office),
      status: findIdx(ALIASES.status),
      client: findIdx(ALIASES.client),
      process: findIdx(ALIASES.process),
      suspended: findIdx(ALIASES.suspended),
      nextDate: dateIdx !== -1 ? dateIdx : 0,
      phone: findIdx(ALIASES.phone)
    };
  }, [headers]);

  const handleMirrorSheets = async (targetId?: string) => {
    const idToUse = targetId || spreadsheetId;
    if (!idToUse) return;
    setIsSyncing(true);
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${idToUse}/export?format=csv`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("Acesso à planilha negado.");
      const csvText = await res.text();
      const values = parseCSV(csvText);
      const currentHeaders = values[0];
      setHeaders(currentHeaders);
      
      const allRows = values.slice(1);
      const formattedRecords = allRows.map((row, i) => {
        const dataObj: any = {};
        currentHeaders.forEach((h, idx) => dataObj[`col_${idx}`] = row[idx] || "");
        return {
          id: `rec_${i}`,
          rowIndex: i,
          data: dataObj,
          lastUpdated: new Date().toISOString()
        };
      });

      setLocalRecords(formattedRecords);
      localStorage.setItem('last_spreadsheet_id', idToUse);
      localStorage.setItem('last_headers', JSON.stringify(currentHeaders));
      
      toast({ title: "Sincronia Elite", description: "Base de dados atualizada." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro de Sincronia", description: e.message });
    } finally { setIsSyncing(false); }
  };

  const handleEngineChange = (val: string) => {
    setAiEngine(val);
    localStorage.setItem('crm_ai_engine', val);
    toast({ title: "Motor Atualizado", description: `Engine ${val.toUpperCase()} ativada.` });
  };

  const activeRecords = useMemo(() => {
    return localRecords.map(r => ({ ...r.data, id: r.id, rowIndex: r.rowIndex, _raw: r }))
      .filter(row => {
        if (!searchTerm) return true;
        return Object.values(row).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()));
      });
  }, [localRecords, searchTerm]);

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full bg-slate-50/30">
          <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
            <SidebarHeader className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
                  <Layers className="h-5 w-5" />
                </div>
                <span className="font-bold text-slate-900 tracking-tight group-data-[collapsible=icon]:hidden">W1 Capital</span>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-3">
              <SidebarMenu>
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
                  { id: 'operations', icon: FileSpreadsheet, label: 'Base de Dados' },
                  { id: 'prazos', icon: Clock, label: 'Agenda Prazos' },
                  { id: 'omni', icon: BrainCircuit, label: 'OmniReport AI' },
                  { id: 'chat', icon: MessageSquare, label: 'Chat Estratégico' },
                  { id: 'docs_gen', icon: FileText, label: 'Gerador Docs' },
                  { id: 'reports', icon: BarChart3, label: 'Analytics BI' },
                  { id: 'docs', icon: FileArchive, label: 'Arquivo Digital' },
                  { id: 'settings', icon: Settings, label: 'Configurações' },
                ].map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      isActive={view === item.id} 
                      onClick={() => setView(item.id as any)} 
                      className={cn(
                        "h-11 rounded-xl transition-all font-semibold uppercase text-[10px] tracking-wider",
                        view === item.id 
                          ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 hover:bg-slate-800" 
                          : "text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      <item.icon className="h-4 w-4" /> 
                      <span className="group-data-[collapsible=icon]:hidden ml-2">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-slate-100 group-data-[collapsible=icon]:hidden">
               <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/60 shadow-sm">
                 <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                   <UserCircle className="h-5 w-5 text-slate-400" />
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-bold text-slate-900 truncate">Analista Sênior</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">W1 Elite Access</p>
                 </div>
                 <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" onClick={() => {
                   localStorage.removeItem('crm_auth_status');
                   window.location.reload();
                 }}><LogOut className="h-3.5 w-3.5" /></Button>
               </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex flex-col flex-1 overflow-hidden bg-white">
            <main className="flex-1 relative overflow-hidden flex flex-col">
              {view === 'settings' ? (
                <div className="h-full p-10 overflow-y-auto bg-slate-50/30">
                  <div className="max-w-2xl mx-auto space-y-10">
                    <header className="space-y-2">
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configurações de Protocolo</h1>
                      <p className="text-sm text-slate-500 font-medium">Gestão de infraestrutura e orquestração de inteligência estratégica.</p>
                    </header>

                    <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
                      <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-slate-900 rounded-xl text-white shadow-lg shadow-slate-900/10"><Database className="h-5 w-5" /></div>
                          <div>
                            <h3 className="font-bold text-slate-900">Conexão Google Sheets</h3>
                            <p className="text-xs text-slate-500">Mapeamento direto de borda e persistência local.</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-8 space-y-6">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Spreadsheet ID</Label>
                          <Input value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} placeholder="Cole o ID da sua planilha..." className="h-14 font-mono text-sm rounded-2xl border-slate-200 focus:ring-primary/20" />
                        </div>
                        <Button className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98]" onClick={() => handleMirrorSheets()} disabled={isSyncing}>
                          {isSyncing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                          {isSyncing ? "SINCROZINANDO..." : "SINCROZINAR BASE DE DADOS"}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
                      <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-primary rounded-xl text-white shadow-lg shadow-primary/20"><Sparkles className="h-5 w-5" /></div>
                          <div>
                            <h3 className="font-bold text-slate-900">Motor de Inteligência AI</h3>
                            <p className="text-xs text-slate-500">Orquestrador de modelos cognitivos V28 Elite.</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-8">
                        <RadioGroup value={aiEngine} onValueChange={handleEngineChange} className="grid grid-cols-1 gap-4">
                          {[
                            { id: 'openrouter', label: 'OpenRouter (GPT-4o)', desc: 'Motor de alta fidelidade para análise estrutural profunda.', badge: 'RECOMENDADO', color: 'bg-blue-50 text-blue-700' },
                            { id: 'grok', label: 'Grok AI (xAI)', desc: 'Inteligência cirúrgica e contextualmente avançada.', badge: 'ELITE', color: 'bg-slate-900 text-white' },
                            { id: 'local', label: 'Heurística Local', desc: 'Processamento imediato baseado em regras locais sem custo.', badge: 'RÁPIDO', color: 'bg-green-50 text-green-700' }
                          ].map((eng) => (
                            <div key={eng.id} className="relative">
                              <RadioGroupItem value={eng.id} id={`eng-${eng.id}`} className="absolute right-6 top-1/2 -translate-y-1/2" />
                              <Label htmlFor={`eng-${eng.id}`} className="block cursor-pointer p-6 rounded-2xl border border-slate-200 hover:border-primary/40 hover:bg-slate-50 transition-all">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-slate-900">{eng.label}</span>
                                  <Badge className={cn("text-[8px] font-bold px-2 py-0.5 h-auto border-none", eng.color)}>{eng.badge}</Badge>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">{eng.desc}</p>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {view === 'dashboard' ? <DashboardView data={activeRecords} headers={headers} indices={indices} onWhatsApp={() => {}} onAction={() => {}} /> :
                   view === 'omni' ? <OmniReportView /> :
                   view === 'chat' ? <AiChatView /> :
                   view === 'docs_gen' ? <DocGeneratorView /> :
                   view === 'prazos' ? <DeadlinesView data={activeRecords} headers={headers} indices={indices} onEdit={() => {}} onWhatsApp={() => {}} onReschedule={() => {}} /> :
                   view === 'reports' ? <ReportsView data={activeRecords} headers={headers} indices={indices} /> :
                   view === 'docs' ? <DocumentsView data={activeRecords} headers={headers} indices={indices} /> :
                   view === 'operations' ? (
                     <div className="h-full flex flex-col bg-slate-50/20">
                        <header className="p-8 bg-white border-b flex items-center justify-between shadow-sm z-10">
                          <div className="space-y-1">
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Base de Dados Integrada</h2>
                            <p className="text-xs font-medium text-slate-500">Persistência local e espelhamento em tempo real.</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="relative w-80">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input placeholder="Filtrar registros..." className="pl-10 h-11 text-xs font-bold rounded-xl border-slate-200 bg-white shadow-sm focus:ring-primary/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <Button variant="outline" className="h-11 px-6 font-bold text-xs rounded-xl border-slate-200 shadow-sm hover:bg-slate-50" onClick={() => handleMirrorSheets()} disabled={isSyncing}>
                              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                              {isSyncing ? "ATUALIZANDO..." : "ATUALIZAR"}
                            </Button>
                            <Badge className="bg-slate-900 text-white h-11 px-5 rounded-xl font-bold shadow-lg shadow-slate-900/10 flex items-center">{activeRecords.length} REGISTROS</Badge>
                          </div>
                        </header>
                        <div className="flex-1 overflow-auto p-4">
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <Table className="w-max min-w-full">
                              <TableHeader className="bg-slate-50/50 sticky top-0 z-10 border-b">
                                <TableRow>
                                  <TableHead className="w-16 border-r text-center bg-slate-50/50">#</TableHead>
                                  {headers.map((h, i) => <TableHead key={i} className="text-[10px] font-bold uppercase text-slate-400 px-6 py-4 border-r min-w-[200px] tracking-widest">{h}</TableHead>)}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {activeRecords.map((row) => (
                                  <TableRow key={row.id} className="hover:bg-slate-50/80 transition-colors border-b last:border-0 group">
                                    <TableCell className="border-r text-center p-2">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditingRow(row._raw); setIsEditorOpen(true); }}>
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TableCell>
                                    {headers.map((_, i) => (
                                      <TableCell key={i} className="text-[11px] font-medium px-6 py-4 border-r whitespace-nowrap text-slate-600">
                                        {row[`col_${i}`]}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                     </div>
                   ) : null}
                </div>
              )}
            </main>
          </SidebarInset>

          <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-3xl border-none shadow-2xl">
              <DialogHeader className="p-8 bg-slate-900 text-white shrink-0">
                <DialogTitle className="text-xl font-bold flex items-center gap-3"><Edit2 className="h-5 w-5" /> Editor de Registro Estruturado</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-10 grid grid-cols-2 gap-8 bg-white">
                 {headers.map((h, i) => (
                   <div key={i} className="space-y-2">
                     <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</Label>
                     <Input value={editingRow?.data?.[`col_${i}`] || ""} onChange={(e) => {
                          const val = e.target.value;
                          setEditingRow((p: any) => ({ ...p, data: { ...p.data, [`col_${i}`]: val } }));
                        }} className="h-12 text-sm font-semibold rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-colors" />
                   </div>
                 ))}
              </div>
              <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 flex gap-4">
                <Button variant="ghost" className="h-14 font-bold px-10 text-slate-400 hover:text-slate-900" onClick={() => setIsEditorOpen(false)}>CANCELAR</Button>
                <Button className="h-14 flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98]" onClick={() => { 
                  if (editingRow) {
                    setLocalRecords(prev => prev.map(r => r.id === editingRow.id ? editingRow : r));
                    toast({ title: "Registro Salvo", description: "Alterações persistidas com sucesso na base local." });
                    setIsEditorOpen(false);
                  }
                }}>SALVAR ALTERAÇÕES</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}