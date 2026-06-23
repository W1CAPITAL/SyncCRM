"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Database, RefreshCw, LayoutDashboard, Clock, LogOut, FileSpreadsheet, 
  BarChart3, FileArchive, Settings, LogIn, Loader2, Search, Filter, AlertCircle
} from "lucide-react";
import { DashboardView } from "./dashboard-view";
import { DeadlinesView } from "./deadlines-view";
import { ReportsView } from "./reports-view";
import { DocumentsView } from "./documents-view";
import { useToast } from "@/hooks/use-toast";
import { useUser, googleProvider, useAuth } from "@/firebase";
import { cn } from "@/lib/utils";
import { signInWithPopup, signOut } from "firebase/auth";

const FICTITIOUS_ID_PLACEHOLDER = "1a2b3c4d5e6f7g8h9i0j_kLmNoPqRsTuVwXyZ";

export interface SheetIndices {
  lawyer: number;
  office: number;
  status: number;
  client: number;
  process: number;
  suspended: number;
  nextDate: number;
}

const ALIASES = {
  client: ["cliente", "nome", "parte", "consumidor", "titular", "requerente", "autor", "beneficiário"],
  process: ["processo", "cnj", "numero processo", "nº processo", "proc", "número", "numero", "protocolo", "id"],
  lawyer: ["advogado", "responsável", "responsavel", "analista", "líder", "operador", "atendente", "user", "colaborador"],
  status: ["status", "situação", "situacao", "fase", "andamento", "estado", "etapa", "decisão"],
  suspended: ["suspenso", "suspensão", "suspensao", "paralisado", "pausado", "sobrestado", "alerta", "parado"],
  office: ["escritório", "escritorio", "empresa", "parceiro", "unidade", "filial", "office", "tribunal", "comarca"],
};

const TJ_MAP: Record<string, string> = {
  "01": "AC", "02": "AL", "03": "AM", "04": "AP", "05": "BA", "06": "CE", "07": "DF",
  "08": "ES", "09": "GO", "10": "MA", "11": "MT", "12": "MS", "13": "MG", "14": "PA",
  "15": "PB", "16": "PR", "17": "PE", "18": "PI", "19": "RJ", "20": "RN", "21": "RS",
  "22": "RO", "23": "RR", "24": "SC", "25": "SE", "26": "SP", "27": "TO",
};

const DATE_PRIORITY = [
  { term: "próximo", weight: 100 },
  { term: "próximo prazo", weight: 99 },
  { term: "📊 prazo", weight: 98 },
  { term: "vencimento", weight: 95 },
  { term: "retorno", weight: 90 },
  { term: "agenda", weight: 85 },
  { term: "prazo", weight: 80 }
];

const DATE_PENALTY = [
  "distribuição", "distribuído", "movimentação", "movimento", "mov", "protocolo", "cadastro", "abertura", "criação", "inclusão", "último", "atualização"
];

const parseCSV = (csvText: string) => {
  const result = [];
  let row = [];
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
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();

  const [view, setView] = useState<'dashboard' | 'operations' | 'prazos' | 'reports' | 'docs' | 'settings'>('settings');
  const [availableTabs, setAvailableTabs] = useState<{name: string, gid: string}[]>([]);
  const [activeTabName, setActiveTabName] = useState<string>("");
  const [readingScope, setReadingScope] = useState<'single' | 'all'>('single');
  const [sheetData, setSheetData] = useState<{ headers: string[], rows: any[] } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState<string>("all");
  
  const indices = useMemo((): SheetIndices => {
    if (!sheetData?.headers) return { lawyer: 0, office: 1, status: 2, client: 3, process: 5, suspended: 7, nextDate: 0 };

    const headers = sheetData.headers.map(h => String(h).toLowerCase().trim());
    
    const findIdx = (aliases: string[]) => {
      return headers.findIndex(h => aliases.some(alias => h === alias || h.includes(alias)));
    };

    let bestDateIdx = -1;
    let maxWeight = -1;

    headers.forEach((h, idx) => {
      if (DATE_PENALTY.some(pen => h.includes(pen))) return;
      const priority = DATE_PRIORITY.find(p => h.includes(p.term));
      if (priority && priority.weight > maxWeight) {
        maxWeight = priority.weight;
        bestDateIdx = idx;
      }
    });

    if (bestDateIdx === -1) {
      bestDateIdx = headers.findIndex(h => (h.includes("data") || h.includes("retorno") || h.includes("prazo")) && !DATE_PENALTY.some(pen => h.includes(pen)));
    }

    return {
      lawyer: findIdx(ALIASES.lawyer),
      office: findIdx(ALIASES.office),
      status: findIdx(ALIASES.status),
      client: findIdx(ALIASES.client),
      process: findIdx(ALIASES.process),
      suspended: findIdx(ALIASES.suspended),
      nextDate: bestDateIdx !== -1 ? bestDateIdx : 0,
    };
  }, [sheetData?.headers]);

  const handleTestConnection = async (newId?: string) => {
    const targetId = newId || spreadsheetId;
    if (!targetId) {
      toast({ variant: "destructive", title: "ID Necessário", description: "Por favor, insira o ID da planilha." });
      setView('settings');
      return;
    }

    setIsSyncing(true);
    setSheetData(null);
    setAvailableTabs([]);
    
    try {
      const token = sessionStorage.getItem('google_access_token');
      if (token) {
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${targetId}?fields=sheets.properties.title,sheets.properties.sheetId`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const tabs = data.sheets.map((s: any) => ({ name: s.properties.title, gid: s.properties.sheetId.toString() }));
          setAvailableTabs(tabs);
          if (tabs.length > 0) {
            setActiveTabName(tabs[0].name);
            await fetchTabData(tabs[0].name, true, targetId, tabs);
            setView('dashboard');
          }
        } else {
          throw new Error("Planilha não encontrada.");
        }
      } else {
        await fetchTabData("Principal", true, targetId);
        setView('dashboard');
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro na Conexão", description: err.message });
      setView('settings');
    } finally { setIsSyncing(false); }
  };

  const fetchTabData = async (tabName: string, force = false, sid?: string, tabsList?: any[]) => {
    const targetId = sid || spreadsheetId;
    if (!targetId) return;

    setIsSyncing(true);
    try {
      let finalHeaders: string[] = [];
      let finalRows: any[] = [];
      const processesSeen = new Set();
      
      const currentTabs = tabsList || availableTabs;
      let tabsToProcess = [];
      
      if (readingScope === 'all' && currentTabs.length > 0) {
        tabsToProcess = currentTabs;
      } else if (currentTabs.length > 0) {
        const activeTab = currentTabs.find(t => t.name === tabName) || currentTabs[0];
        tabsToProcess = [activeTab];
      } else {
        tabsToProcess = [{ name: tabName || "Principal", gid: "" }];
      }
      
      for (const tab of tabsToProcess) {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${targetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab.name)}`;
        const res = await fetch(csvUrl);
        if (res.ok) {
          const csvText = await res.text();
          const values = parseCSV(csvText);
          if (values.length) {
            if (finalHeaders.length === 0) finalHeaders = values[0];
            
            const tabRows = values.slice(1).map((row: any[], i: number) => {
              const obj: any = { _id: `${tab.name}_${i}`, _tabName: tab.name, _rowIndex: i };
              finalHeaders.forEach((_, idx) => {
                obj[`col_${idx}`] = row[idx] || "";
              });
              
              const processKey = String(obj[`col_${indices.process}`] || "").trim();
              if (processKey && processesSeen.has(processKey)) return null;
              if (processKey) processesSeen.add(processKey);
              
              return obj;
            }).filter(Boolean);
            
            finalRows = [...finalRows, ...tabRows];
          }
        }
      }

      setSheetData({ headers: finalHeaders, rows: finalRows });
      if (force) toast({ title: "Sincronizado", description: `${finalRows.length} registros.` });
    } catch (e) { 
      toast({ variant: "destructive", title: "Erro na sincronização" }); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handleCellEdit = useCallback((rowObj: any, colIdx: number, value: string) => {
    if (!sheetData || !user) return;
    const token = sessionStorage.getItem('google_access_token');
    
    setSheetData(prev => {
      if (!prev) return null;
      const newRows = prev.rows.map(r => r._id === rowObj._id ? { ...r, [`col_${colIdx}`]: value } : r);
      return { ...prev, rows: newRows };
    });

    if (token) {
      const sourceTab = rowObj._tabName || activeTabName;
      const sourceIdx = rowObj._rowIndex;
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sourceTab}'!R${sourceIdx + 2}C${colIdx + 1}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ values: [[value]] })
      });
    }
  }, [sheetData, activeTabName, spreadsheetId, user]);

  const filteredRows = useMemo(() => {
    if (!sheetData?.rows) return [];
    
    return sheetData.rows.filter(row => {
      const matchesSearch = !searchTerm || Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );

      let matchesState = true;
      if (selectedState !== "all") {
        const proc = String(row[`col_${indices.process}`] || "");
        const match = proc.match(/\.8\.(\d{2})\./);
        const state = match ? TJ_MAP[match[1]] : "OUTROS";
        matchesState = state === selectedState;
      }

      return matchesSearch && matchesState;
    });
  }, [sheetData?.rows, searchTerm, selectedState, indices.process]);

  const ufs = useMemo(() => Object.values(TJ_MAP).sort(), []);

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full bg-white overflow-hidden">
          <Sidebar collapsible="icon" className="border-r bg-zinc-950 text-white border-zinc-800">
            <SidebarHeader className="border-b border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-primary" />
                <span className="font-bold uppercase tracking-tighter group-data-[collapsible=icon]:hidden">SyncCRM V4</span>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-2">
              <SidebarMenu>
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: 'Painel Geral' },
                  { id: 'operations', icon: FileSpreadsheet, label: 'Operações' },
                  { id: 'prazos', icon: Clock, label: 'Controle de Prazos' },
                  { id: 'reports', icon: BarChart3, label: 'BI Executivo' },
                  { id: 'docs', icon: FileArchive, label: 'Arquivo Digital' },
                  { id: 'settings', icon: Settings, label: 'Configurações' },
                ].map((item) => (
                  <SidebarMenuButton 
                    key={item.id} 
                    isActive={view === item.id} 
                    onClick={() => setView(item.id as any)} 
                    className="text-white hover:bg-zinc-800"
                  >
                    <item.icon className="h-4 w-4" /> 
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                ))}
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>

          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <header className="flex h-14 items-center justify-between border-b px-6 bg-white shrink-0">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Badge variant="outline" className="text-[10px] font-black uppercase">
                  {user ? user.displayName?.toUpperCase() : "VISITANTE"}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => fetchTabData(activeTabName, true)} disabled={isSyncing || !spreadsheetId}>
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isSyncing && "animate-spin")} /> 
                  Sync
                </Button>
                {user ? (
                  <Button variant="ghost" size="sm" onClick={() => signOut(auth)}>
                    <LogOut className="h-3.5 w-3.5 mr-2" /> Sair
                  </Button>
                ) : (
                  <Button size="sm" className="bg-zinc-900 text-white" onClick={() => signInWithPopup(auth, googleProvider)}>
                    <LogIn className="h-3.5 w-3.5 mr-2" /> Entrar
                  </Button>
                )}
              </div>
            </header>

            <main className="flex-1 relative bg-zinc-50 overflow-hidden flex flex-col">
              {!spreadsheetId && view !== 'settings' ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
                  <div className="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Conecte sua Planilha</h2>
                    <p className="text-sm text-zinc-500 max-w-sm">Insira o ID da sua planilha Google nas configurações.</p>
                  </div>
                  <Button onClick={() => setView('settings')} className="bg-zinc-900 text-white font-bold">
                    CONFIGURAÇÕES
                  </Button>
                </div>
              ) : view === 'dashboard' ? (
                <DashboardView 
                  data={sheetData?.rows || []} 
                  headers={sheetData?.headers || []} 
                  indices={indices} 
                  onWhatsApp={() => {}} 
                  onReschedule={() => {}} 
                  onNavigateToReports={() => setView('reports')} 
                />
              ) : view === 'operations' ? (
                <div className="flex flex-col h-full bg-white">
                  <div className="p-4 border-b bg-zinc-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-4">
                      <h2 className="text-sm font-black uppercase tracking-widest">Base de Dados</h2>
                      <Badge variant="secondary" className="text-[10px] font-black">{filteredRows.length} REGISTROS</Badge>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                        <Input 
                          placeholder="Pesquisar..." 
                          className="pl-8 h-9 text-xs" 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-zinc-400" />
                        <Select value={selectedState} onValueChange={setSelectedState}>
                          <SelectTrigger className="h-9 w-[120px] text-xs">
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {ufs.map(uf => (
                              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                            ))}
                            <SelectItem value="OUTROS">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto bg-white p-0 m-0" id="operations-scroll-area">
                    <Table className="w-max min-w-full border-collapse m-0 p-0">
                      <TableHeader className="bg-zinc-100 sticky top-0 z-20 shadow-sm">
                        <TableRow>
                          {sheetData?.headers.map((h, i) => (
                            <TableHead key={i} className="text-[10px] font-black uppercase text-zinc-600 whitespace-nowrap px-4 py-3 border-r border-b border-zinc-200 bg-zinc-100 min-w-[150px]">
                              {h}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.map((row) => (
                          <TableRow key={row._id} className="hover:bg-zinc-50 transition-colors">
                            {sheetData?.headers.map((_, i) => (
                              <TableCell key={i} className="text-[11px] px-4 py-2 border-r border-b whitespace-nowrap font-medium min-w-[150px]">
                                {String(row[`col_${i}`] || "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : view === 'reports' ? (
                <ReportsView data={sheetData?.rows || []} headers={sheetData?.headers || []} indices={indices} />
              ) : view === 'prazos' ? (
                <DeadlinesView 
                  data={sheetData?.rows || []} 
                  headers={sheetData?.headers || []} 
                  indices={indices} 
                  onEdit={handleCellEdit} 
                  onWhatsApp={() => {}} 
                  onReschedule={() => {}} 
                />
              ) : view === 'docs' ? (
                <DocumentsView data={sheetData?.rows || []} headers={sheetData?.headers || []} indices={indices} />
              ) : view === 'settings' ? (
                <div className="h-full p-8 overflow-y-auto">
                  <div className="max-w-2xl mx-auto space-y-8">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Configurações</h2>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-zinc-500">ID da Planilha Google</Label>
                        <Input 
                          value={spreadsheetId} 
                          onChange={(e) => setSpreadsheetId(e.target.value)} 
                          placeholder={FICTITIOUS_ID_PLACEHOLDER}
                          className="font-mono text-xs" 
                        />
                        <p className="text-[9px] text-zinc-400">Ex: {FICTITIOUS_ID_PLACEHOLDER}</p>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                        <div>
                          <Label className="text-xs font-bold">Consolidação Multi-Aba</Label>
                          <p className="text-[10px] text-zinc-500">Unifica registros de todas as abas.</p>
                        </div>
                        <Switch checked={readingScope === 'all'} onCheckedChange={(val) => setReadingScope(val ? 'all' : 'single')} />
                      </div>
                      <Button 
                        className="w-full h-11 bg-zinc-900 text-white font-bold" 
                        onClick={() => handleTestConnection()} 
                        disabled={isSyncing || !spreadsheetId}
                      >
                        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        SINCRONIZAR
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}