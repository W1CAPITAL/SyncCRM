
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
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Database, LayoutDashboard, Clock, LogOut, FileSpreadsheet, 
  BarChart3, FileArchive, Settings, Search, Edit2, Layers,
  BrainCircuit, ShieldCheck, Cpu, Zap, MessageSquare, FileText,
  Loader2
} from "lucide-react";

// Importações dinâmicas para isolar bibliotecas pesadas e evitar erro de 'super' keyword no build
const DocGeneratorView = dynamic(() => import("./doc-generator-view").then(mod => mod.DocGeneratorView), {
  loading: () => <div className="flex-1 flex items-center justify-center bg-zinc-50"><Loader2 className="h-8 w-8 animate-spin text-zinc-300" /></div>,
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
import { useToast } from "@/hooks/use-toast";

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

const TJ_MAP: Record<string, string> = {
  "01": "AC", "02": "AL", "03": "AM", "04": "AP", "05": "BA", "06": "CE", "07": "DF",
  "08": "ES", "09": "GO", "10": "MA", "11": "MT", "12": "MS", "13": "MG", "14": "PA",
  "15": "PB", "16": "PR", "17": "PE", "18": "PI", "19": "RJ", "20": "RN", "21": "RS",
  "22": "RO", "23": "RR", "24": "SC", "25": "SE", "26": "SP", "27": "TO",
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

  const [view, setView] = useState<'dashboard' | 'operations' | 'prazos' | 'reports' | 'docs' | 'settings' | 'omni' | 'chat' | 'docs_gen'>('settings');
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [aiEngine, setAiEngine] = useState<string>("openrouter");
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [localRecords, setLocalRecords] = useState<any[]>([]);

  useEffect(() => {
    const savedId = localStorage.getItem('last_spreadsheet_id');
    const savedHeaders = localStorage.getItem('last_headers');
    const savedEngine = localStorage.getItem('crm_ai_engine') || "openrouter";
    
    if (savedId) setSpreadsheetId(savedId);
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

  const handleMirrorSheets = async () => {
    if (!spreadsheetId) return;
    setIsSyncing(true);
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("Planilha inacessível.");
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
      localStorage.setItem('last_spreadsheet_id', spreadsheetId);
      localStorage.setItem('last_headers', JSON.stringify(currentHeaders));
      
      toast({ title: "Sincronia Total", description: `${formattedRecords.length} registros capturados via Borda.` });
      setView('dashboard');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na Captura", description: e.message });
    } finally { setIsSyncing(false); }
  };

  const handleEngineChange = (val: string) => {
    setAiEngine(val);
    localStorage.setItem('crm_ai_engine', val);
    toast({ title: "Gateway Atualizado", description: `Motor ${val.toUpperCase()} selecionado.` });
  };

  const activeRecords = useMemo(() => {
    return localRecords.map(r => ({ 
      ...r.data, 
      id: r.id, 
      rowIndex: r.rowIndex,
      _raw: r
    })).filter(row => {
      const vals = Object.values(row).join(" ").toLowerCase();
      const matchesSearch = !searchTerm || vals.includes(searchTerm.toLowerCase());
      const proc = String(row[`col_${indices.process}`] || "");
      const match = proc.match(/\.8\.(\d{2})\./);
      const state = match ? (TJ_MAP[match[1]] || "OUTROS") : "OUTROS";
      return matchesSearch && (selectedState === "all" || state === selectedState);
    });
  }, [localRecords, searchTerm, selectedState, indices.process]);

  const handleLogout = () => {
    localStorage.removeItem('crm_auth_status');
    window.location.reload();
  };

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full bg-white overflow-hidden">
          <Sidebar collapsible="icon" className="border-r bg-zinc-950 text-white border-zinc-800">
            <SidebarHeader className="border-b border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <Layers className="h-6 w-6 text-primary" />
                <span className="font-black uppercase tracking-tighter group-data-[collapsible=icon]:hidden">W1 Capital</span>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-2">
              <SidebarMenu>
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: 'Painel Central' },
                  { id: 'operations', icon: FileSpreadsheet, label: 'Gestão Planilha' },
                  { id: 'prazos', icon: Clock, label: 'Controle Prazos' },
                  { id: 'omni', icon: BrainCircuit, label: 'OmniReport AI' },
                  { id: 'chat', icon: MessageSquare, label: 'Chat Estratégico' },
                  { id: 'docs_gen', icon: FileText, label: 'Gerador de Docs' },
                  { id: 'reports', icon: BarChart3, label: 'Analytics Hub' },
                  { id: 'docs', icon: FileArchive, label: 'Arquivo Digital' },
                  { id: 'settings', icon: Settings, label: 'Configurações' },
                ].map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton isActive={view === item.id} onClick={() => setView(item.id as any)} className="text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
                      <item.icon className="h-4 w-4" /> 
                      <span className="group-data-[collapsible=icon]:hidden font-black uppercase text-[10px] tracking-widest">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-6 border-t border-zinc-900 group-data-[collapsible=icon]:hidden">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black text-zinc-100 uppercase tracking-tight">© Todos os direitos Reservados</p>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">W1 Capital</p>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <header className="flex h-14 items-center justify-between border-b px-6 bg-white shrink-0 shadow-sm">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Badge variant="outline" className="text-[10px] font-black uppercase border-zinc-300">SyncCRM Elite V42</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-zinc-900 uppercase">Consultor Sênior</span>
                <Button variant="ghost" size="sm" className="h-9 text-[10px] font-black uppercase" onClick={handleLogout}><LogOut className="h-3.5 w-3.5 mr-2" /> Sair</Button>
              </div>
            </header>

            <main className="flex-1 relative bg-zinc-50 overflow-hidden flex flex-col">
              {view === 'settings' ? (
                <div className="h-full p-8 overflow-y-auto space-y-8">
                  <div className="max-w-xl mx-auto space-y-8">
                    <Card className="p-8 space-y-6 shadow-xl border-2 bg-white rounded-2xl">
                      <div className="space-y-2 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md"><Database className="h-7 w-7" /></div>
                        <h2 className="text-xl font-black uppercase tracking-tighter">Conexão Independente</h2>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Integração Direta com Google Sheets</p>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase text-zinc-500">Google Spreadsheet ID</Label>
                        <Input value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} placeholder="ID da URL da sua planilha" className="h-12 font-mono text-xs border-2" />
                      </div>
                      <Button className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 font-black text-white text-xs uppercase tracking-widest" onClick={handleMirrorSheets} disabled={isSyncing}>
                        {isSyncing ? "CONECTANDO..." : "ATIVAR SYNC DE BORDA"}
                      </Button>
                    </Card>

                    <Card className="p-8 space-y-6 shadow-xl border-2 bg-white rounded-2xl border-zinc-100">
                      <div className="space-y-2 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-white shadow-md"><Zap className="h-7 w-7" /></div>
                        <h2 className="text-xl font-black uppercase tracking-tighter">Motor Cognitivo</h2>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Gateway de Inteligência AI V42</p>
                      </div>
                      
                      <RadioGroup value={aiEngine} onValueChange={handleEngineChange} className="grid grid-cols-1 gap-4">
                        <div className="flex items-center space-x-3 space-y-0 rounded-xl border-2 p-4 cursor-pointer hover:bg-zinc-50 transition-colors">
                          <RadioGroupItem value="openrouter" id="engine-openrouter" />
                          <Label htmlFor="engine-openrouter" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-xs uppercase">OpenRouter (GPT-4o Mini)</span>
                              <Badge variant="outline" className="text-[8px] font-black border-zinc-300">NUVEM ELITE</Badge>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-medium">Análise de alta fidelidade processada em borda.</p>
                          </Label>
                        </div>

                        <div className="flex items-center space-x-3 space-y-0 rounded-xl border-2 p-4 cursor-pointer hover:bg-zinc-50 transition-colors">
                          <RadioGroupItem value="grok" id="engine-grok" />
                          <Label htmlFor="engine-grok" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-xs uppercase">Grok AI (xAI via Puter)</span>
                              <Badge variant="outline" className="text-[8px] font-black border-zinc-900 text-white bg-zinc-900">X-AI ELITE</Badge>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-medium">Inteligência local via navegador (User-Pays).</p>
                          </Label>
                        </div>

                        <div className="flex items-center space-x-3 space-y-0 rounded-xl border-2 p-4 cursor-pointer hover:bg-zinc-50 transition-colors">
                          <RadioGroupItem value="local" id="engine-local" />
                          <Label htmlFor="engine-local" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-xs uppercase">Motor Local (Offline)</span>
                              <Badge variant="outline" className="text-[8px] font-black border-blue-200 text-blue-600 bg-blue-50">REGRAS</Badge>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-medium">Análise heurística imediata sem custo de API.</p>
                          </Label>
                        </div>
                      </RadioGroup>
                    </Card>

                    <Card className="p-8 space-y-4 shadow-lg border-2 bg-zinc-900 text-white rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary rounded-lg text-white"><ShieldCheck className="h-5 w-5" /></div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Protocolo Edge</p>
                          <p className="text-xs font-black uppercase">Arquitetura de Borda Cloudflare</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-400 italic leading-relaxed uppercase">
                        Sistema purificado. Desacoplamento total do Firebase concluído. O SyncCRM agora opera via API Routes dinâmicas, garantindo 100% de compatibilidade fora do Studio.
                      </p>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col overflow-hidden">
                  {view === 'operations' && (
                    <div className="p-4 border-b flex items-center justify-between bg-zinc-100/50 gap-4 shrink-0">
                      <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input placeholder="Buscar na base..." className="pl-10 h-10 text-xs font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                         <Button variant="default" size="sm" className="h-10 text-[10px] font-black uppercase bg-zinc-900" onClick={handleMirrorSheets} disabled={isSyncing}>
                           {isSyncing ? "ATUALIZANDO..." : "SINCRONIZAR AGORA"}
                         </Button>
                         <Badge className="bg-white border-2 border-zinc-200 text-zinc-900 h-10 px-4 flex items-center gap-2 font-black">
                           {activeRecords.length} REGISTROS
                         </Badge>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    {view === 'dashboard' ? <DashboardView data={activeRecords} headers={headers} indices={indices} onWhatsApp={() => {}} onAction={() => {}} /> :
                     view === 'omni' ? <OmniReportView /> :
                     view === 'chat' ? <AiChatView /> :
                     view === 'docs_gen' ? <DocGeneratorView /> :
                     view === 'prazos' ? <DeadlinesView data={activeRecords} headers={headers} indices={indices} onEdit={() => {}} onWhatsApp={() => {}} onReschedule={() => {}} /> :
                     view === 'reports' ? <ReportsView data={activeRecords} headers={headers} indices={indices} /> :
                     view === 'docs' ? <DocumentsView data={activeRecords} headers={headers} indices={indices} /> :
                     view === 'operations' ? (
                       <div className="h-full flex flex-col bg-white">
                         <div className="flex-1 overflow-auto">
                           <Table className="w-max min-w-full border-separate border-spacing-0">
                             <TableHeader className="bg-zinc-100 sticky top-0 z-20">
                               <TableRow>
                                 <TableHead className="w-14 text-center border-r border-b">MOD</TableHead>
                                 {headers.map((h, i) => (
                                   <TableHead key={`h-${i}`} className="text-[10px] font-black uppercase px-6 border-r border-b min-w-[180px] h-14 bg-zinc-100">{h}</TableHead>
                                 ))}
                               </TableRow>
                             </TableHeader>
                             <TableBody>
                               {activeRecords.map((row) => (
                                 <TableRow key={row.id} className="hover:bg-zinc-50 border-b">
                                   <TableCell className="border-r border-b text-center">
                                     <Button variant="ghost" size="icon" onClick={() => { setEditingRow(row._raw); setIsEditorOpen(true); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                                   </TableCell>
                                   {headers.map((_, i) => (
                                     <TableCell key={`c-${row.id}-${i}`} className="text-[11px] px-6 py-4 border-r border-b whitespace-nowrap">{row[`col_${i}`]}</TableCell>
                                   ))}
                                 </TableRow>
                               ))}
                             </TableBody>
                           </Table>
                         </div>
                       </div>
                     ) : null}
                  </div>
                </div>
              )}
            </main>
          </SidebarInset>

          <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
            <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] bg-white border-2">
              <DialogHeader className="border-b pb-6">
                <DialogTitle className="font-black uppercase text-xl flex items-center gap-3">
                  <div className="p-2 bg-zinc-900 rounded-lg text-white"><Edit2 className="h-5 w-5" /></div>
                  Editor de Registro
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 py-8">
                 {headers.map((h, i) => (
                   <div key={`field-${i}`} className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-zinc-400">{h}</Label>
                     <Input value={editingRow?.data?.[`col_${i}`] || ""} onChange={(e) => {
                          const val = e.target.value;
                          setEditingRow((p: any) => ({ ...p, data: { ...p.data, [`col_${i}`]: val } }));
                        }} className="h-12 text-xs font-bold" />
                   </div>
                 ))}
              </div>
              <DialogFooter className="sticky bottom-0 bg-white pt-6 border-t flex gap-4">
                <Button variant="outline" className="h-14 font-black text-xs flex-1" onClick={() => setIsEditorOpen(false)}>DESCARTAR</Button>
                <Button className="bg-zinc-900 text-white font-black h-14 flex-1" onClick={() => { 
                  if (editingRow) {
                    setLocalRecords(prev => prev.map(r => r.id === editingRow.id ? editingRow : r));
                    toast({ title: "Registro Salvo", description: "Alteração persistida no cache local." });
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
