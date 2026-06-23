
"use client";

import React, { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  Printer, Download, ImageIcon, Loader2, TrendingUp, Users, Building2, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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

    const lawyers: Record<string, number> = {};
    const offices: Record<string, number> = {};
    const statusDist: Record<string, number> = {};
    const tribunals: Record<string, number> = {};

    const advIdx = 0;    // Coluna A
    const escrIdx = 1;   // Coluna B
    const statusIdx = 2; // Coluna C
    const procIdx = 5;   // Coluna F

    data.forEach(row => {
      const adv = String(row[`col_${advIdx}`] || "").toUpperCase().trim();
      if (adv && adv !== "0" && adv !== "RESPONSÁVEL" && adv.length > 2) {
        lawyers[adv] = (lawyers[adv] || 0) + 1;
      }

      const escr = String(row[`col_${escrIdx}`] || "").toUpperCase().trim();
      if (escr && escr !== "0" && escr !== "ESCRITÓRIO" && escr.length > 1) {
        offices[escr] = (offices[escr] || 0) + 1;
      }

      const st = String(row[`col_${statusIdx}`] || "").toUpperCase().trim();
      if (st && st !== "0" && st !== "STATUS") {
        statusDist[st] = (statusDist[st] || 0) + 1;
      }

      const fullProc = String(row[`col_${procIdx}`] || "").toUpperCase().trim();
      const cnjMatch = fullProc.match(/\.8\.(\d{2})\./);
      if (cnjMatch) {
        const code = cnjMatch[1];
        const stateName = `TJ${TJ_MAP[code] || code}`;
        tribunals[stateName] = (tribunals[stateName] || 0) + 1;
      }
    });

    const formatData = (rec: Record<string, number>) => 
      Object.entries(rec)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // Agrupa status pequenos
    const rawStatus = formatData(statusDist);
    const topStatus = rawStatus.slice(0, 7);
    const otherStatus = rawStatus.slice(7).reduce((acc, curr) => acc + curr.value, 0);
    if (otherStatus > 0) topStatus.push({ name: "OUTROS", value: otherStatus });

    return {
      lawyers: formatData(lawyers),
      offices: formatData(offices),
      status: topStatus,
      tribunals: formatData(tribunals).slice(0, 15),
      total: data.length
    };
  }, [data, headers]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    toast({ title: "Iniciando Exportação", description: "Capturando BI completo (incluindo volume por tribunal)..." });

    try {
      // Força o container a mostrar tudo (remove scroll temporariamente)
      const originalStyle = reportRef.current.style.height;
      const originalOverflow = reportRef.current.style.overflow;
      reportRef.current.style.height = 'auto';
      reportRef.current.style.overflow = 'visible';

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f9fafb',
        width: 1200 // Largura fixa para manter proporção
      });

      // Restaura estilos
      reportRef.current.style.height = originalStyle;
      reportRef.current.style.overflow = originalOverflow;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;

      // Adiciona primeira página
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      // Adiciona páginas extras se necessário
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`SyncCRM_BI_Executivo_${new Date().getTime()}.pdf`);
      toast({ title: "PDF Gerado", description: "O download do BI completo foi concluído." });
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "Erro na Exportação", 
        description: "Falha ao capturar BI. Tente usar 'Impressão Rápida'." 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPNG = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.download = `SyncCRM_Visao_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na Imagem", description: e.message });
    } finally {
      setIsExporting(false);
    }
  };

  if (!stats) return null;

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b p-4 shadow-sm shrink-0 z-50 print:hidden">
        <div className="flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-4">
          <div>
            <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tighter">BI Gerencial Premium</h2>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Análise de {stats.total} registros</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" className="font-black text-[9px] h-9" onClick={() => window.print()} disabled={isExporting}>
              <Printer className="h-3.5 w-3.5 mr-2" /> IMPRESSÃO RÁPIDA
            </Button>
            <Button className="bg-zinc-900 hover:bg-zinc-800 text-white font-black text-[9px] h-9" onClick={handleDownloadPDF} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-2" />}
              EXPORTAR PDF COMPLETO
            </Button>
            <Button variant="secondary" size="sm" className="font-black text-[9px] h-9" onClick={handleDownloadPNG} disabled={isExporting}>
              <ImageIcon className="h-3.5 w-3.5 mr-2" /> PNG
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8" id="report-scroll-area">
        <div ref={reportRef} className="space-y-8 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-zinc-900 text-white border-none shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Volume Total</p>
                </div>
                <p className="text-4xl font-black">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm border-l-4 border-l-blue-600">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-4 w-4 text-zinc-400" />
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Responsáveis Ativos</p>
                </div>
                <p className="text-4xl font-black text-blue-600">{stats.lawyers.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm border-l-4 border-l-green-600">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="h-4 w-4 text-zinc-400" />
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Escritórios (Col B)</p>
                </div>
                <p className="text-4xl font-black text-green-600">{stats.offices.length}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="border-b bg-zinc-50/50">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Composição da Carteira (Status)</CardTitle>
              </CardHeader>
              <CardContent className="h-[350px] pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={stats.status} 
                      cx="50%" cy="45%" 
                      innerRadius={65} outerRadius={105} 
                      paddingAngle={5} dataKey="value" 
                      stroke="none"
                    >
                      {stats.status.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="border-b bg-zinc-50/50">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Volume por Tribunal (Filtro CNJ)</CardTitle>
              </CardHeader>
              <CardContent className="h-[350px] pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.tribunals} layout="vertical" margin={{ left: 40, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20}>
                      {stats.tribunals.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="border-b bg-zinc-50/50">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Top Responsáveis (Coluna A)</CardTitle>
              </CardHeader>
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="bg-zinc-100/50 border-b">
                      <th className="p-3 text-left font-black uppercase">Responsável</th>
                      <th className="p-3 text-right font-black uppercase">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.lawyers.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-b hover:bg-zinc-50/50">
                        <td className="p-3 font-bold text-zinc-700">{row.name}</td>
                        <td className="p-3 font-black text-right text-primary">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="border-b bg-zinc-50/50">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Top Escritórios (Coluna B)</CardTitle>
              </CardHeader>
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="bg-zinc-100/50 border-b">
                      <th className="p-3 text-left font-black uppercase">Escritório</th>
                      <th className="p-3 text-right font-black uppercase">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.offices.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-b hover:bg-zinc-50/50">
                        <td className="p-3 font-bold text-zinc-700">{row.name}</td>
                        <td className="p-3 font-black text-right text-green-600">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
