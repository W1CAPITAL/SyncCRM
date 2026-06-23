
"use client";

import React, { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  Printer, Download, Loader2, Database, TrendingUp, Users, AlertCircle, Clock, CheckCircle2, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { parse, isBefore, isToday, startOfDay, isValid } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface ReportsViewProps {
  data: any[];
  headers: string[];
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#111827'];

const TJ_MAP: Record<string, string> = {
  "01": "AC", "02": "AL", "03": "AM", "04": "AP", "05": "BA", "06": "CE", "07": "DF",
  "08": "ES", "09": "GO", "10": "MA", "11": "MT", "12": "MS", "13": "MG", "14": "PA",
  "15": "PB", "16": "PR", "17": "PE", "18": "PI", "19": "RJ", "20": "RN", "21": "RS",
  "22": "RO", "23": "RR", "24": "SC", "25": "SE", "26": "SP", "27": "TO",
};

export function ReportsView({ data, headers }: ReportsViewProps) {
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const stats = useMemo(() => {
    if (!data || data.length === 0 || !headers.length) return null;

    const today = startOfDay(new Date());
    const lawyers: Record<string, number> = {};
    const offices: Record<string, number> = {};
    const statusDist: Record<string, number> = {};
    const tribunals: Record<string, number> = {};

    let overdueCount = 0;
    let todayContact = 0;
    let active = 0;

    const advIdx = 0;    // Coluna A
    const escrIdx = 1;   // Coluna B
    const statusIdx = 2; // Coluna C
    const procIdx = 5;   // Coluna F (CNJ)
    const hIdx = 7;      // Coluna H (Suspenso)
    const proxIdx = 13;  // Coluna N (Próximo)

    data.forEach(row => {
      const st = String(row[`col_${statusIdx}`] || "").toUpperCase().trim();
      const adv = String(row[`col_${advIdx}`] || "").toUpperCase().trim();
      const colH = String(row[`col_${hIdx}`] || "").toUpperCase().trim();

      const isClosed = 
        st.includes("ENCERRADO") || 
        st.includes("ARQUIVADO") || 
        st.includes("JULGADO") || 
        st.includes("SUCUMBENCIAS") ||
        adv === "ENCERRADO" ||
        colH === "SUSPENSO";

      if (!isClosed) {
        active++;
        
        const proxStr = String(row[`col_${proxIdx}`] || "").trim();
        if (proxStr && proxStr !== "0") {
          try {
            const proxDate = parse(proxStr, 'dd/MM/yyyy', today);
            if (isValid(proxDate)) {
              const proxStart = startOfDay(proxDate);
              if (isBefore(proxStart, today)) overdueCount++;
              else if (isToday(proxStart)) todayContact++;
            }
          } catch (e) {}
        }

        if (adv && adv !== "0" && adv !== "RESPONSÁVEL") {
          lawyers[adv] = (lawyers[adv] || 0) + 1;
        }

        const escr = String(row[`col_${escrIdx}`] || "").toUpperCase().trim();
        if (escr && escr !== "0" && escr !== "ESCRITÓRIO") {
          offices[escr] = (offices[escr] || 0) + 1;
        }

        const fullProc = String(row[`col_${procIdx}`] || "").toUpperCase().trim();
        const cnjMatch = fullProc.match(/\.8\.(\d{2})\./);
        if (cnjMatch) {
          const code = cnjMatch[1];
          const stateName = `TJ${TJ_MAP[code] || code}`;
          tribunals[stateName] = (tribunals[stateName] || 0) + 1;
        }
      }

      if (st && st !== "0" && st !== "STATUS") {
        statusDist[st] = (statusDist[st] || 0) + 1;
      }
    });

    const formatData = (rec: Record<string, number>) => 
      Object.entries(rec)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const statusData = formatData(statusDist);
    const mainStatus = statusData.slice(0, 5);
    const othersValue = statusData.slice(5).reduce((acc, curr) => acc + curr.value, 0);
    if (othersValue > 0) mainStatus.push({ name: "OUTROS", value: othersValue });

    return {
      lawyers: formatData(lawyers),
      offices: formatData(offices),
      status: mainStatus,
      tribunals: formatData(tribunals).slice(0, 15),
      total: data.length,
      overdueCount,
      todayContact,
      active
    };
  }, [data, headers]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    toast({ 
      title: "Gerando PDF Executivo", 
      description: "Fatiando páginas para o formato A4..." 
    });

    try {
      const container = reportRef.current;
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        height: container.scrollHeight
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // LÓGICA DE FATIAMENTO A4
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`SyncCRM_Relatorio_${new Date().getTime()}.pdf`);
      toast({ title: "Exportação Concluída", description: "PDF salvo com sucesso." });
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "Falha na Exportação", 
        description: "Erro ao renderizar gráficos localmente." 
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!stats) return null;

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden relative">
      <header className="bg-white border-b p-4 shadow-sm shrink-0 z-50 print:hidden">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tighter">Inteligência Operacional</h2>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Dashboards Unificados e BI Executivo</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="font-black text-[9px] h-9" onClick={() => window.print()} disabled={isExporting}>
              <Printer className="h-3.5 w-3.5 mr-2" /> IMPRIMIR
            </Button>
            <Button className="bg-zinc-900 text-white font-black text-[9px] h-9" onClick={handleDownloadPDF} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Download className="h-3.5 w-3.5 mr-2" />}
              EXPORTAR PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 bg-zinc-50" id="report-scroll-container">
        <div ref={reportRef} className="space-y-12 max-w-7xl mx-auto w-full pb-20 bg-white p-8 rounded-xl border border-zinc-200">
          
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Visão Geral da Carteira</h3>
              <Badge variant="outline" className="text-[9px] font-black uppercase bg-zinc-50 border-zinc-200">
                DATA: {new Date().toLocaleDateString()}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-red-600 bg-red-50/20 shadow-none border-zinc-100">
                <CardContent className="pt-6">
                  <p className="text-[9px] font-black uppercase text-red-600">Atrasados</p>
                  <p className="text-3xl font-black text-red-600 tabular-nums">{stats.overdueCount}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500 bg-amber-50/20 shadow-none border-zinc-100">
                <CardContent className="pt-6">
                  <p className="text-[9px] font-black uppercase text-amber-600">Pendências Hoje</p>
                  <p className="text-3xl font-black text-amber-500 tabular-nums">{stats.todayContact}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-600 bg-blue-50/20 shadow-none border-zinc-100">
                <CardContent className="pt-6">
                  <p className="text-[9px] font-black uppercase text-blue-600">Carteira Ativa</p>
                  <p className="text-3xl font-black text-blue-600 tabular-nums">{stats.active}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-zinc-900 bg-zinc-900 text-white shadow-none border-none">
                <CardContent className="pt-6">
                  <p className="text-[9px] font-black uppercase text-zinc-400">Total na Base</p>
                  <p className="text-3xl font-black tabular-nums">{stats.total}</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-none border-zinc-100 bg-white overflow-hidden">
              <CardHeader className="border-b bg-zinc-50/30">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Distribuição por Status (Coluna C)</CardTitle>
              </CardHeader>
              <CardContent className="h-[350px] pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={stats.status} 
                      cx="50%" cy="40%" 
                      innerRadius={60} outerRadius={90} 
                      paddingAngle={5} dataKey="value" 
                    >
                      {stats.status.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-none border-zinc-100 bg-white overflow-hidden">
              <CardHeader className="border-b bg-zinc-50/30">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Volume por Tribunal (CNJ)</CardTitle>
              </CardHeader>
              <CardContent className="h-[350px] pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.tribunals} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={18}>
                      {stats.tribunals.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Users className="h-3 w-3" /> Ranking de Responsáveis (Coluna A)
              </h3>
              <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-[11px]">
                  <thead className="bg-zinc-50 border-b">
                    <tr>
                      <th className="p-3 text-left font-black uppercase tracking-tighter">Responsável</th>
                      <th className="p-3 text-right font-black uppercase tracking-tighter">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.lawyers.slice(0, 12).map((row, i) => (
                      <tr key={i} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50">
                        <td className="p-3 font-bold text-zinc-700 truncate uppercase">{row.name}</td>
                        <td className="p-3 font-black text-right text-primary tabular-nums">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Database className="h-3 w-3" /> Ranking de Escritórios (Coluna B)
              </h3>
              <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-[11px]">
                  <thead className="bg-zinc-50 border-b">
                    <tr>
                      <th className="p-3 text-left font-black uppercase tracking-tighter">Escritório</th>
                      <th className="p-3 text-right font-black uppercase tracking-tighter">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.offices.slice(0, 12).map((row, i) => (
                      <tr key={i} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50">
                        <td className="p-3 font-bold text-zinc-700 truncate uppercase">{row.name}</td>
                        <td className="p-3 font-black text-right text-green-600 tabular-nums">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
