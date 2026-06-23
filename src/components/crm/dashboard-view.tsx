
"use client";

import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertCircle, Clock, CheckCircle2, TrendingUp, 
  Loader2, Phone, MessageSquare, Download, Printer 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parse, isBefore, isToday, startOfDay, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface DashboardProps {
  data: any[];
  headers: string[];
  onWhatsApp: (row: any, headers: string[]) => void;
  onReschedule: (row: any) => void;
}

function parseFlexibleDate(val: string): Date | null {
  if (!val || val === "0") return null;
  const clean = val.trim();
  if (!clean) return null;

  const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'M/d/yyyy'];
  
  for (const fmt of formats) {
    try {
      const d = parse(clean, fmt, new Date());
      if (isValid(d)) return d;
    } catch (e) {}
  }

  const native = new Date(clean);
  if (isValid(native)) return native;

  return null;
}

export function DashboardView({ data, headers, onWhatsApp, onReschedule }: DashboardProps) {
  const { toast } = useToast();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const stats = useMemo(() => {
    if (!data.length || !headers.length) return null;

    const today = startOfDay(new Date());
    
    // MAPEAMENTO CONFORME ESPECIFICAÇÃO
    const statusIdx = 2; // Coluna C
    const clientIdx = 3; // Coluna D
    const procIdx = 5;   // Coluna F
    const proxIdx = 13;  // Coluna N

    let overdueCount = 0;
    let todayContact = 0;
    let active = 0;
    let urgentCases: any[] = [];

    data.forEach(row => {
      const st = String(row[`col_${statusIdx}`] || "").toUpperCase().trim();
      const isClosed = st.includes("ENCERRADO") || st.includes("ARQUIVADO") || st.includes("JULGADO");

      if (!isClosed) {
        active++;
        const proxStr = String(row[`col_${proxIdx}`] || "").trim();
        const proxDate = parseFlexibleDate(proxStr);
        
        if (proxDate) {
          const proxDateStart = startOfDay(proxDate);
          
          if (isBefore(proxDateStart, today)) {
            overdueCount++;
            if (urgentCases.length < 20) urgentCases.push(row);
          } else if (isToday(proxDateStart)) {
            todayContact++;
            if (urgentCases.length < 20 && !urgentCases.includes(row)) urgentCases.push(row);
          }
        }
      }
    });

    return { overdueCount, todayContact, active, total: data.length, urgentCases, clientIdx, procIdx, headers };
  }, [data, headers]);

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    toast({ title: "Iniciando Exportação", description: "Gerando PDF do Painel Geral..." });

    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SyncCRM_Dashboard_${new Date().getTime()}.pdf`);
      
      toast({ title: "PDF Gerado", description: "O download foi concluído." });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Erro na Exportação", 
        description: error.message 
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Calculando estatísticas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50/30 overflow-hidden">
      <header className="bg-white border-b p-4 flex items-center justify-between shrink-0 print:hidden">
        <div>
          <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Painel Geral</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Mapeamento: Coluna N (Próximo)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> IMPRIMIR
          </Button>
          <Button size="sm" className="h-9 text-[10px] font-bold bg-zinc-900" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            EXPORTAR PDF
          </Button>
        </div>
      </header>

      <div ref={dashboardRef} className="flex-1 overflow-y-auto p-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-red-600 shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">Atrasados (Próximo &lt; Hoje)</p>
                  <p className="text-4xl font-black text-red-600 tabular-nums">{stats.overdueCount}</p>
                </div>
                <div className="bg-red-50 p-2 rounded-lg"><AlertCircle className="h-5 w-5 text-red-600" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Pendências para Hoje</p>
                  <p className="text-4xl font-black text-amber-500 tabular-nums">{stats.todayContact}</p>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg"><Clock className="h-5 w-5 text-amber-500" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-600 shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Carteira Ativa</p>
                  <p className="text-4xl font-black text-blue-600 tabular-nums">{stats.active}</p>
                </div>
                <div className="bg-blue-50 p-2 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
          <Card className="lg:col-span-2 shadow-sm border-none bg-white">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest">Casos que Requerem Atenção</h3>
              <Badge variant="destructive" className="text-[9px]">AÇÃO PRIORITÁRIA</Badge>
            </div>
            <div className="divide-y divide-zinc-50">
              {stats.urgentCases.map((row, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 truncate uppercase">
                        {String(row[`col_${stats.clientIdx}`] || "Cliente").toUpperCase()}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase truncate">
                        PROCESSO: {String(row[`col_${stats.procIdx}`] || "--")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold" onClick={() => onWhatsApp(row, stats.headers)}>
                      <MessageSquare className="h-3.5 w-3.5 mr-2" /> WHATSAPP
                    </Button>
                    <Button size="sm" className="h-8 text-[10px] font-bold bg-zinc-900" onClick={() => onReschedule(row)}>
                      REAGENDAR
                    </Button>
                  </div>
                </div>
              ))}
              {stats.urgentCases.length === 0 && (
                <div className="p-20 text-center space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
                  <p className="text-xs font-black uppercase text-zinc-400">Nenhuma urgência detectada!</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="shadow-sm border-none bg-zinc-900 text-white h-fit">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">BI Rápido</p>
                <h3 className="text-lg font-black uppercase leading-tight">Métricas da Base</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[10px] font-bold text-zinc-400">Total Geral</span>
                  <span className="text-sm font-black">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[10px] font-bold text-zinc-400">Casos Ativos</span>
                  <span className="text-sm font-black text-blue-400">{stats.active}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[10px] font-bold text-zinc-400">Taxa de Atraso</span>
                  <span className="text-sm font-black text-red-400">
                    {stats.active > 0 ? ((stats.overdueCount / stats.active) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
