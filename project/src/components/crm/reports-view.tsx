
"use client";

import React, { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Printer, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { startOfDay, isBefore, isToday, isValid, parse } from "date-fns";
import { SheetIndices } from "./sheet-explorer";

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#111827'];

const TJ_MAP: Record<string, string> = {
  "01": "AC", "02": "AL", "03": "AM", "04": "AP", "05": "BA", "06": "CE", "07": "DF",
  "08": "ES", "09": "GO", "10": "MA", "11": "MT", "12": "MS", "13": "MG", "14": "PA",
  "15": "PB", "16": "PR", "17": "PE", "18": "PI", "19": "RJ", "20": "RN", "21": "RS",
  "22": "RO", "23": "RR", "24": "SC", "25": "SE", "26": "SP", "27": "TO",
};

const INACTIVE_KEYWORDS = [
  "ENCERRADO", "ARQUIVADO", "BAIXADO", "FINALIZADO", "EXTINTO", 
  "SUSPENSO", "SOBRESTADO", "JULGADO", "CANCELADO", "INATIVO"
];

const parseSheetDate = (value: any) => {
  if (!value || value === "0" || String(value).trim() === "") return null;
  const str = String(value).trim().split(' ')[0];
  try {
    const parts = str.includes("/") ? str.split("/") : str.split("-");
    let date;
    if (parts[0].length === 4) date = new Date(str);
    else {
      date = parse(str, 'dd/MM/yyyy', new Date());
      if (!isValid(date)) date = parse(str, 'dd/MM/yy', new Date());
    }
    return isValid(date) ? startOfDay(date) : null;
  } catch { return null; }
};

export function ReportsView({ data, headers, indices }: { data: any[], headers: string[], indices: SheetIndices }) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    if (!data || data.length === 0 || !headers.length) return null;

    const hoje = startOfDay(new Date());
    const lawyers: Record<string, number> = {};
    const statusDist: Record<string, number> = {};
    const tribunals: Record<string, number> = {};

    let overdueCount = 0;
    let todayContact = 0;
    let activeCount = 0;

    data.forEach(row => {
      const st = String(row[`col_${indices.status}`] || "").toUpperCase().trim();
      const adv = String(row[`col_${indices.lawyer}`] || "").toUpperCase().trim();
      const proc = String(row[`col_${indices.process}`] || "").trim();

      const isInativo = INACTIVE_KEYWORDS.some(k => st.includes(k));
      if (isInativo) return;

      activeCount++;

      const proxDate = parseSheetDate(row[`col_${indices.nextDate}`]);
      if (proxDate) {
        if (isBefore(proxDate, hoje)) overdueCount++;
        else if (isToday(proxDate)) todayContact++;
      }

      if (adv && adv !== "0") lawyers[adv] = (lawyers[adv] || 0) + 1;
      
      const match = String(proc).match(/\.8\.(\d{2})\./);
      if (match) {
        const state = TJ_MAP[match[1]] || "OUTROS";
        tribunals[state] = (tribunals[state] || 0) + 1;
      }
      if (st && st !== "0") statusDist[st] = (statusDist[st] || 0) + 1;
    });

    const formatData = (rec: Record<string, number>) => Object.entries(rec).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return {
      lawyers: formatData(lawyers).slice(0, 10),
      status: formatData(statusDist).slice(0, 8),
      tribunals: formatData(tribunals).slice(0, 10),
      total: data.length, // Agora mostra o total real de linhas sincronizadas
      overdueCount, todayContact, active: activeCount
    };
  }, [data, indices]);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    toast({ title: "Exportando PDF Executivo", description: "Gerando relatório paginado..." });

    try {
      const container = printRef.current;
      const canvas = await html2canvas(container, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Relatorio_SyncCRM_${new Date().getTime()}.pdf`);
    } catch (e) {
      toast({ variant: "destructive", title: "Erro na exportação" });
    } finally {
      setIsExporting(false);
    }
  };

  if (!stats) return null;

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b p-4 shadow-sm shrink-0 z-50 print:hidden">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tighter">BI Executivo</h2>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Motor V7 de Captura Total</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="font-black text-[9px] h-9" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-2" /> IMPRIMIR
            </Button>
            <Button className="bg-zinc-900 text-white font-black text-[9px] h-9" onClick={handleDownloadPDF} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Download className="h-3.5 w-3.5 mr-2" />} 
              PDF MASTER
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8 scroll-black" id="report-scroll-area">
        <div ref={printRef} className="space-y-12 max-w-7xl mx-auto w-full bg-white p-10 rounded-xl border border-zinc-200 shadow-sm">
          <div className="border-b pb-8">
            <h1 className="text-2xl font-black uppercase tracking-tighter mb-6">Relatório Consolidado V7</h1>
            <div className="grid grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-red-600 bg-red-50/20 shadow-none">
                <CardContent className="pt-6">
                  <p className="text-[9px] font-black uppercase text-red-600">Atrasados (Anterior a Hoje)</p>
                  <p className="text-3xl font-black text-red-600">{stats.overdueCount}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500 bg-amber-50/20 shadow-none">
                <CardContent className="pt-6">
                  <p className="text-[9px] font-black uppercase text-amber-600">Pendências de Hoje</p>
                  <p className="text-3xl font-black text-amber-500">{stats.todayContact}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-600 bg-blue-50/20 shadow-none">
                <CardContent className="pt-6">
                  <p className="text-[9px] font-black uppercase text-blue-600">Carteira Ativa</p>
                  <p className="text-3xl font-black text-blue-600">{stats.active}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-zinc-900 bg-zinc-900 text-white shadow-none">
                <CardContent className="pt-6">
                  <p className="text-[9px] font-black uppercase text-zinc-400">Total Base Capturada</p>
                  <p className="text-3xl font-black">{stats.total}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-none border-zinc-100 overflow-hidden">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase">Distribuição de Status</CardTitle></CardHeader>
              <CardContent className="h-[400px] p-4 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                    <Pie 
                      data={stats.status} 
                      cx="50%" 
                      cy="45%" 
                      innerRadius={60} 
                      outerRadius={90} 
                      paddingAngle={5} 
                      dataKey="value"
                      labelLine={true}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {stats.status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '10px', fontWeight: 'bold', borderRadius: '8px' }} />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center" 
                      layout="horizontal"
                      wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '30px' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="shadow-none border-zinc-100 overflow-hidden">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase">Processos por Tribunal</CardTitle></CardHeader>
              <CardContent className="h-[400px] p-4 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.tribunals} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 'bold'}} />
                    <YAxis tick={{fontSize: 9, fontWeight: 'bold'}} />
                    <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
