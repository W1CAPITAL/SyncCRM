
"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { 
  Database, LayoutDashboard, Clock, LogOut, FileSpreadsheet, 
  BarChart3, FileArchive, Settings, Loader2, Search, Edit2, Layers, Copyright,
  BrainCircuit, DownloadCloud
} from "lucide-react";
import { DashboardView } from "./dashboard-view";
import { DeadlinesView } from "./deadlines-view";
import { ReportsView } from "./reports-view";
import { DocumentsView } from "./documents-view";
import { OmniReportView } from "./omni-report-view";
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

  const [view, setView] = useState<'dashboard' | 'operations' | 'prazos' | 'reports' | 'docs' | 'settings' | 'omni'>('settings');
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [localRecords, setLocalRecords] = useState<any[]>([]);

  // Carrega ID salvo localmente
  useEffect(() => {
    const savedId = localStorage.getItem('last_spreadsheet_id');
    const savedHeaders = localStorage.getItem('last_headers');
    if (savedId) setSpreadsheetId(savedId);
    if (savedHeaders) setHeaders(JSON.parse(savedHeaders));
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
    setSyncProgress(0);
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("Planilha inacessível. Verifique se está pública ou com o ID correto.");
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
      
      toast({ title: "Base Carregada Localmente", description: `${formattedRecords.length} registros capturados com sucesso.` });
      setView('dashboard');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro no Carregamento", description: e.message });
    } finally { setIsSyncing(false); }
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
    sessionStorage.removeItem('is_authenticated');
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
                  { id: 'reports', icon: BarChart3, label: 'Analytics Hub' },
                  { id: 'docs', icon: FileArchive, label: 'Arquivo Digital' },
                  { id: 'settings', icon: Settings, label: 'JD Usuário' },
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
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-black text-zinc-100 uppercase tracking-tight">W1 Capital</p>
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Davi Alves Figueredo</p>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <header className="flex h-14 items-center justify-between border-b px-6 bg-white shrink-0 shadow-sm">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Badge variant="outline" className="text-[10px] font-black uppercase border-zinc-300">SyncCRM V12 Independent</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-zinc-900 uppercase">Analista Sênior</span>
                <Button variant="ghost" size="sm" className="h-9 text-[10px] font-black uppercase" onClick={handleLogout}><LogOut className="h-3.5 w-3.5 mr-2" /> Sair</Button>
              </div>
            </header>

            <main className="flex-1 relative bg-zinc-50 overflow-hidden flex flex-col">
              {view === 'settings' ? (
                <div className="h-full p-8 flex flex-col items-center justify-center space-y-6">
                   <Card className="w-full max-w-lg p-10 space-y-8 shadow-2xl border-2 bg-white rounded-3xl">
                    <div className="space-y-2 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-xl"><Database className="h-8 w-8" /></div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter">JD Usuário</h2>
                      <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-[0.3em]">Gestão Local Independente</p>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-zinc-500">Google Spreadsheet ID</Label>
                      <Input value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} placeholder="ID da URL da sua planilha" className="h-14 font-mono text-sm border-2 rounded-xl" />
                    </div>
                    <Button className="w-full h-16 bg-zinc-900 hover:bg-zinc-800 font-black text-white uppercase tracking-widest rounded-xl" onClick={handleMirrorSheets} disabled={isSyncing}>
                      {isSyncing ? <span className="flex items-center gap-2"><Loader2 className="h-6 w-6 animate-spin" /> CARREGANDO...</span> : "ATIVAR SYNC INDEPENDENTE"}
                    </Button>
                   </Card>
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
                           {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DownloadCloud className="h-4 w-4 mr-2" />}
                           ATUALIZAR BASE
                         </Button>
                         <Badge className="bg-white border-2 border-zinc-200 text-zinc-900 h-10 px-4 flex items-center gap-2 font-black">
                           {activeRecords.length} REGISTROS CARREGADOS
                         </Badge>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    {view === 'dashboard' ? <DashboardView data={activeRecords} headers={headers} indices={indices} onWhatsApp={() => {}} onAction={() => {}} /> :
                     view === 'omni' ? <OmniReportView /> :
                     view === 'prazos' ? <DeadlinesView data={activeRecords} headers={headers} indices={indices} onEdit={() => {}} onWhatsApp={() => {}} onReschedule={() => {}} /> :
                     view === 'reports' ? <ReportsView data={activeRecords} headers={headers} indices={indices} /> :
                     view === 'docs' ? <DocumentsView data={activeRecords} headers={headers} indices={indices} /> :
                     view === 'operations' ? (
                       <div className="h-full flex flex-col bg-white">
                         <div className="flex-1 overflow-auto scroll-black">
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
            <DialogContent className="max-w-3xl scroll-black overflow-y-auto max-h-[90vh] bg-white border-2 rounded-3xl">
              <DialogHeader className="border-b pb-6">
                <DialogTitle className="font-black uppercase text-xl flex items-center gap-3">
                  <div className="p-2 bg-zinc-900 rounded-lg text-white"><Edit2 className="h-5 w-5" /></div>
                  Editor Veredito
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
                <Button variant="outline" className="h-14 font-black text-xs flex-1 rounded-xl" onClick={() => setIsEditorOpen(false)}>DESCARTAR</Button>
                <Button className="bg-zinc-900 text-white font-black h-14 flex-1 rounded-xl" onClick={() => { 
                  if (editingRow) {
                    setLocalRecords(prev => prev.map(r => r.id === editingRow.id ? editingRow : r));
                    toast({ title: "Registro Atualizado", description: "Alteração salva localmente. Sincronize com a planilha para persistir." });
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
