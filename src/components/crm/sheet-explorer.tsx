
"use client";

import React, { useState, useMemo, useEffect, useCallback, memo, useRef } from "react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Database, RefreshCw, LayoutDashboard, Search, Clock, LogIn, FileSpreadsheet, 
  LogOut, BarChart3, Loader2, Filter, CheckCircle, FileArchive, Settings, 
  Briefcase, Globe, MessageSquare
} from "lucide-react";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { DashboardView } from "./dashboard-view";
import { DeadlinesView } from "./deadlines-view";
import { ReportsView } from "./reports-view";
import { DocumentsView } from "./documents-view";
import { useToast } from "@/hooks/use-toast";
import { useUser, googleProvider, useAuth } from "@/firebase";
import { cn } from "@/lib/utils";
import { signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import { parse, isBefore, startOfDay, isValid } from "date-fns";

const DEFAULT_SPREADSHEET_ID = "1JHiy3SbHRd5di5U9Zx4yvKrCSKtaOnFQdiZo0RDY9O0";
const COLUMN_WIDTH = 220;

// MAPEAMENTO DEFINITIVO
const IDX_ADV = 0;    // Col A (Responsável)
const IDX_OFFICE = 1; // Col B (Escritório)
const IDX_STATUS = 2; // Col C (Status)
const IDX_CLIENT = 3; // Col D (Cliente)
const IDX_PROX = 13;  // Col N (Próximo)
const IDX_PROC = 5;   // Col F (Processo/Tribunal)

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

export const handleWhatsAppAction = (row: any, headers: string[]) => {
  // Busca telefone em colunas prováveis
  const telIdx = headers.findIndex(h => {
    const head = h.toUpperCase();
    return head.includes("TELEFONE") || head.includes("CELULAR") || head.includes("WHATSAPP") || head.includes("TEL");
  });
  
  const clientName = String(row[`col_${IDX_CLIENT}`] || "Cliente");
  const phoneRaw = String(telIdx !== -1 ? row[`col_${telIdx}`] : "").replace(/\D/g, "");
  
  if (!phoneRaw) {
    alert("Telefone não identificado para este cliente.");
    return;
  }

  const phone = phoneRaw.startsWith('55') ? phoneRaw : `55${phoneRaw}`;
  const msg = encodeURIComponent(`Olá ${clientName.toUpperCase()}, tudo bem? Gostaríamos de conversar sobre o andamento do seu processo.`);
  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
};

const Cell = memo(({ value, rowIdx, colIdx, onEdit, isProx }: { 
  value: string, rowIdx: number, colIdx: number, 
  onEdit: (r: number, c: number, v: string) => void, isProx?: boolean 
}) => {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = () => {
    setEditing(false);
    if (localValue !== value) onEdit(rowIdx, colIdx, localValue);
  };

  const valUpper = String(value).toUpperCase();
  const isVencido = valUpper.includes("VENCIDO") || valUpper.includes("ATRASADO");
  const isEncerrado = valUpper.includes("ENCERRADO") || valUpper.includes("ARQUIVADO");
  
  let isAtrasadoData = false;
  if (isProx && value && value !== "0" && value.includes("/")) {
    try {
      const today = startOfDay(new Date());
      const date = parse(value.trim(), 'dd/MM/yyyy', new Date());
      if (isValid(date) && isBefore(date, today)) isAtrasadoData = true;
    } catch (e) {}
  }

  return (
    <div 
      className={cn(
        "border-r px-3 flex items-center h-full overflow-hidden text-[11px] shrink-0",
        editing ? "p-0 ring-1 ring-inset ring-primary z-20 bg-white" : "hover:bg-black/5 cursor-text",
        (isVencido || isAtrasadoData) && !editing && "bg-red-600 text-white font-bold",
        isEncerrado && !editing && "bg-zinc-100 text-zinc-400 opacity-60"
      )}
      style={{ width: COLUMN_WIDTH }}
      onDoubleClick={() => { setEditing(true); setLocalValue(value); }}
    >
      {editing ? (
        <input 
          autoFocus className="w-full h-full bg-white px-3 outline-none" 
          value={localValue} onChange={(e) => setLocalValue(e.target.value)} 
          onBlur={handleBlur} onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(); if (e.key === 'Escape') setEditing(false); }}
        />
      ) : (
        <span className="truncate block w-full">{value}</span>
      )}
    </div>
  );
});
Cell.displayName = "Cell";

const MemoizedRow = memo(({ row, rowIdx, headers, onEdit, onSelect, isSelected, style, proxIdx }: { 
  row: any, rowIdx: number, headers: string[], onEdit: any, onSelect: any, isSelected: boolean, style: any, proxIdx: number 
}) => {
  return (
    <div 
      style={style}
      className={cn(
        "flex h-9 transition-colors group border-b cursor-default absolute w-full items-stretch",
        isSelected ? "bg-primary/10 ring-1 ring-inset ring-primary/30 z-10" : "hover:bg-zinc-50/50"
      )}
      onClick={() => onSelect(row)}
    >
      <div className="flex items-center justify-center border-r bg-zinc-100 text-[10px] text-zinc-500 font-mono w-12 flex-shrink-0 sticky left-0 z-10">
        {rowIdx + 1}
      </div>
      <div className="flex items-stretch">
        {headers.map((_, colIdx) => (
          <Cell key={`${row._id}-${colIdx}`} value={row[`col_${colIdx}`] || ""} rowIdx={rowIdx} colIdx={colIdx} onEdit={onEdit} isProx={colIdx === proxIdx} />
        ))}
      </div>
    </div>
  );
});
MemoizedRow.displayName = "MemoizedRow";

export function SheetExplorer() {
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();

  const [view, setView] = useState<'dashboard' | 'operations' | 'prazos' | 'reports' | 'docs' | 'settings'>('dashboard');
  const [availableTabs, setAvailableTabs] = useState<{name: string, gid: string}[]>([]);
  const [activeTabName, setActiveTabName] = useState<string>("");
  const [sheetData, setSheetData] = useState<{ headers: string[], rows: any[] } | null>(null);
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState(DEFAULT_SPREADSHEET_ID);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLawyer, setFilterLawyer] = useState("all");
  
  const parentRef = useRef<HTMLDivElement>(null);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) sessionStorage.setItem('google_access_token', credential.accessToken);
      handleCheckStructure();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro no login", description: e.message });
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem('google_access_token');
    window.location.reload();
  };

  const handleCheckStructure = async () => {
    setIsCheckingSync(true);
    try {
      const token = sessionStorage.getItem('google_access_token');
      if (token) {
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title,sheets.properties.sheetId`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const tabs = data.sheets.map((s: any) => ({ name: s.properties.title, gid: s.properties.sheetId.toString() }));
          setAvailableTabs(tabs);
          if (tabs.length > 0 && !activeTabName) setActiveTabName(tabs[0].name);
          return;
        }
      }

      const gvizRes = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`);
      if (gvizRes.ok) {
        const text = await gvizRes.text();
        const json = JSON.parse(text.substring(text.indexOf("(") + 1, text.lastIndexOf(")")));
        if (json.table) {
           setAvailableTabs([{ name: "Principal", gid: "0" }]);
           if (!activeTabName) setActiveTabName("Principal");
        }
      }
    } catch (error) {
      console.error("Discovery failed", error);
    } finally {
      setIsCheckingSync(false);
    }
  };

  const fetchTabData = async (tabName: string) => {
    if (!tabName) return;
    setIsCheckingSync(true);
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("Aba inacessível.");
      const csvText = await res.text();
      const values = parseCSV(csvText);
      if (values.length) {
        const headersList = values[0];
        const rows = values.slice(1).map((row: any[], i: number) => {
          const obj: any = { _id: i.toString() };
          headersList.forEach((_, idx) => obj[`col_${idx}`] = row[idx] || "");
          return obj;
        });
        setSheetData({ headers: headersList, rows });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro de Sincronização", description: "Falha ao baixar dados." });
    } finally {
      setIsCheckingSync(false);
    }
  };

  useEffect(() => { handleCheckStructure(); }, [spreadsheetId]);
  useEffect(() => { if (activeTabName) fetchTabData(activeTabName); }, [activeTabName]);

  const handleCellEdit = useCallback((rowIdx: number, colIdx: number, value: string) => {
    if (!sheetData) return;
    const token = sessionStorage.getItem('google_access_token');
    
    setSheetData(prev => {
      if (!prev) return null;
      const newRows = [...prev.rows];
      newRows[rowIdx] = { ...newRows[rowIdx], [`col_${colIdx}`]: value };
      return { ...prev, rows: newRows };
    });

    if (token) {
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${activeTabName}'!R${rowIdx + 2}C${colIdx + 1}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ values: [[value]] })
      });
    }
  }, [sheetData, activeTabName, spreadsheetId]);

  const filteredRows = useMemo(() => {
    if (!sheetData) return [];
    let rows = sheetData.rows;
    const today = startOfDay(new Date());

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      rows = rows.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(lower)));
    }

    if (filterStatus !== "all") {
      rows = rows.filter(row => {
        const st = String(row[`col_${IDX_STATUS}`] || "").toUpperCase();
        const px = String(row[`col_${IDX_PROX}`] || "").trim();
        if (filterStatus === "vencido") {
          try {
            const date = parse(px, 'dd/MM/yyyy', new Date());
            return isValid(date) && isBefore(date, today);
          } catch { return false; }
        }
        if (filterStatus === "encerrado") return st.includes("ENCERRADO") || st.includes("ARQUIVADO");
        return !st.includes("ENCERRADO");
      });
    }

    if (filterLawyer !== "all") {
      rows = rows.filter(row => String(row[`col_${IDX_ADV}`] || "").toUpperCase() === filterLawyer);
    }

    return rows;
  }, [sheetData, searchQuery, filterStatus, filterLawyer]);

  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full bg-white overflow-hidden text-zinc-900">
          <Sidebar collapsible="icon" className="border-r bg-zinc-950 text-white border-zinc-800 shrink-0">
            <SidebarHeader className="border-b border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-primary" />
                <span className="font-bold text-white group-data-[collapsible=icon]:hidden">SyncCRM</span>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-2">
              <SidebarMenu>
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: 'Painel Geral' },
                  { id: 'operations', icon: FileSpreadsheet, label: 'Casos (Operação)' },
                  { id: 'prazos', icon: Clock, label: 'Controle de Prazos' },
                  { id: 'reports', icon: BarChart3, label: 'BI Executivo' },
                  { id: 'docs', icon: FileArchive, label: 'Arquivo Digital' },
                  { id: 'settings', icon: Settings, label: 'Configurações' },
                ].map((item) => (
                  <SidebarMenuButton key={item.id} isActive={view === item.id} onClick={() => setView(item.id as any)} className="text-white hover:bg-zinc-900 data-[active=true]:bg-primary font-medium">
                    <item.icon className="h-4 w-4" /> <span>{item.label}</span>
                  </SidebarMenuButton>
                ))}
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>

          <SidebarInset className="flex flex-col flex-1 overflow-hidden min-w-0">
            <header className="flex h-14 items-center justify-between border-b px-6 bg-white shrink-0 z-50 print:hidden">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div className="h-6 w-px bg-zinc-200" />
                <Badge variant="outline" className={cn("text-[10px] font-black uppercase", user ? "text-green-600 border-green-200" : "text-zinc-400")}>
                  {user ? `👤 ${user.displayName?.toUpperCase()}` : "ACESSO PÚBLICO"}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                {!user ? (
                  <Button size="sm" className="h-8 font-bold text-[11px] bg-zinc-900" onClick={handleLogin}>Entrar com Google</Button>
                ) : (
                  <Button variant="ghost" size="sm" className="h-8 text-[11px]" onClick={handleLogout}><LogOut className="h-3.5 w-3.5 mr-2" /> Sair</Button>
                )}
              </div>
            </header>

            <main className="flex-1 relative bg-zinc-50 overflow-hidden">
              {view === 'dashboard' ? (
                <DashboardView 
                  data={sheetData?.rows || []} 
                  headers={sheetData?.headers || []} 
                  onWhatsApp={handleWhatsAppAction} 
                  onReschedule={setSelectedRow}
                  onNavigateToReports={() => setView('reports')}
                />
              ) : view === 'reports' ? (
                <ReportsView data={sheetData?.rows || []} headers={sheetData?.headers || []} />
              ) : view === 'prazos' ? (
                <DeadlinesView 
                  data={sheetData?.rows || []} 
                  headers={sheetData?.headers || []} 
                  onEdit={handleCellEdit} 
                  onWhatsApp={handleWhatsAppAction} 
                  onReschedule={setSelectedRow} 
                />
              ) : view === 'docs' ? (
                <DocumentsView data={sheetData?.rows || []} headers={sheetData?.headers || []} />
              ) : view === 'settings' ? (
                <div className="h-full p-8 overflow-y-auto">
                  <div className="max-w-2xl mx-auto space-y-8">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Ajustes da Conexão</h2>
                    <Card><CardContent className="pt-6 space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-zinc-400">ID da Google Sheet</Label>
                        <Input value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} className="font-mono text-xs" />
                      </div>
                      <Button className="w-full bg-zinc-900 text-white font-bold" onClick={() => handleCheckStructure()}>TESTAR CONEXÃO</Button>
                    </CardContent></Card>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="bg-white border-b p-3 space-y-3 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input className="h-9 pl-10 text-xs bg-zinc-50" placeholder="Buscar na base..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                      </div>
                      <Button variant="outline" size="sm" className="h-9 text-[11px] font-bold" onClick={() => fetchTabData(activeTabName)}>
                        <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isCheckingSync && "animate-spin")} /> SINCRONIZAR
                      </Button>
                    </div>
                  </div>

                  <div ref={parentRef} className="flex-1 overflow-auto bg-white relative">
                    {isCheckingSync && !sheetData ? (
                      <div className="flex h-full items-center justify-center flex-col gap-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (
                      <div style={{ height: rowVirtualizer.getTotalSize(), width: 'max-content' }}>
                        <div className="sticky top-0 z-20 flex bg-zinc-100 border-b h-10">
                          <div className="w-12 h-10 border-r flex items-center justify-center text-[11px] font-bold text-zinc-400 sticky left-0 bg-zinc-100">#</div>
                          {sheetData?.headers.map((h, i) => (
                            <div key={`h-${i}`} className="h-10 border-r px-4 flex items-center text-[10px] font-bold text-zinc-600 uppercase truncate bg-zinc-100" style={{ width: COLUMN_WIDTH }}>{h}</div>
                          ))}
                        </div>
                        {rowVirtualizer.getVirtualItems().map((vRow) => (
                          <MemoizedRow key={filteredRows[vRow.index]._id} row={filteredRows[vRow.index]} rowIdx={vRow.index} headers={sheetData?.headers || []} onEdit={handleCellEdit} onSelect={setSelectedRow} isSelected={selectedRow?._id === filteredRows[vRow.index]._id} style={{ position: 'absolute', top: 0, left: 0, height: vRow.size, transform: `translateY(${vRow.start}px)` }} proxIdx={IDX_PROX} />
                        ))}
                      </div>
                    )}
                  </div>

                  <footer className="h-10 bg-zinc-900 border-t flex items-center px-2 shrink-0">
                    {availableTabs.map((tab) => (
                      <button key={tab.name} onClick={() => setActiveTabName(tab.name)} className={cn("h-full px-5 text-[10px] font-bold border-r border-zinc-800 uppercase tracking-widest", activeTabName === tab.name ? "bg-primary text-white" : "text-zinc-400 hover:bg-zinc-800")}>{tab.name}</button>
                    ))}
                    <div className="ml-auto px-4 text-[9px] text-zinc-500 font-bold uppercase">{filteredRows.length} Casos Encontrados</div>
                  </footer>
                </div>
              )}
            </main>
          </SidebarInset>
          
          <Sheet open={!!selectedRow} onOpenChange={(o) => !o && setSelectedRow(null)}>
            <SheetContent className="sm:max-w-[500px] flex flex-col p-0 border-l-4 border-l-primary">
              <SheetHeader className="p-8 bg-zinc-50 border-b shrink-0">
                <SheetTitle className="text-xl font-black uppercase tracking-tighter">Gestão do Caso</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-12 border-2 border-green-600 text-green-600 font-black text-[10px] uppercase" onClick={() => handleWhatsAppAction(selectedRow, sheetData?.headers || [])}>WhatsApp</Button>
                  <Button variant="outline" className="h-12 border-2 border-zinc-900 text-zinc-900 font-black text-[10px] uppercase" onClick={() => handleCellEdit(parseInt(selectedRow._id), IDX_STATUS, "ENCERRADO")}>Encerrar Caso</Button>
                </div>
                <hr className="my-6" />
                {sheetData?.headers.map((h, i) => (
                  <div key={`edit-${i}`} className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase">{h}</Label>
                    <Input className="text-xs h-9" value={selectedRow?.[`col_${i}`] || ""} onChange={(e) => handleCellEdit(parseInt(selectedRow._id), i, e.target.value)} />
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
