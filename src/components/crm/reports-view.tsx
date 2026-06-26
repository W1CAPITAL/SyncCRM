"use client";

import React, { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Printer, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { UnifiedMetrics } from "@/lib/metrics-engine";

const COLORS = ['#111827', '#dc2626', '#f59e0b', '#2563eb', '#10b981', '#8b5cf6'];

export function ReportsView({ metrics }: { metrics: UnifiedMetrics }) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const lawyersData = Object.entries(metrics.lawyersPerformance)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const segments = [
      { name: 'Urgência Máxima', value: metrics.reallyOverdue.length },
      { name: 'Crítico Comum', value: metrics.commonOverdue.length },
      { name: 'Prazos Hoje', value: metrics.todayPrazos.length },
      { name: 'No Prazo', value: metrics.onTimePrazos.length },
    ].filter(s => s.value > 0);

    return { lawyersData, segments };
  }, [metrics]);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    toast({ title: "Exportando Relatório Master", description: "Gerando PDF Executivo V51..." });

    try {
      const canvas = await html2canvas(printRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`SyncCRM_V51_Report_${new Date().getTime()}.pdf`);
    } catch (e) {
      toast({ variant: "destructive", title: "Erro na exportação" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b p-4 shadow-sm shrink-0 z-50 print:hidden">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tighter">BI de Performance Elite</h2>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Relatório Mestre de Gabinete V51.5</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="font-black text-[9px] h-9" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-2" /> IMPRIMIR
            </Button>
            <Button className="bg-zinc-900 text-white font-black text-[9px] h-9" onClick={handleDownloadPDF} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Download className="h-3.5 w-3.5 mr-2" />} 
              BAIXAR PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8 scroll-black">
        <div ref={printRef} className="space-y-12 max-w-7xl mx-auto w-full bg-white p-10 rounded-xl border border-zinc-200 shadow-sm">
          <div className="border-b pb-8">
            <h1 className="text-2xl font-black uppercase tracking-tighter mb-6 text-zinc-900">Health Check Operacional</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-red-600 bg-red-50 shadow-none">
                <CardContent className="pt-6">
                  <p className="text-[8px] font-black uppercase text-red-600 mb-1">Vencido (Crítico)</p>
                  <p className="text-3xl font-black text-red-600">{metrics.reallyOverdue.length}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-orange-500 bg-orange-50 shadow-none">
                <CardContent className="pt-6">
                  <p className="text-[8px] font-black uppercase text-orange-600 mb-1">Atrasos Comuns</p>
                  <p className="text-3xl font-black text-orange-600">{metrics.commonOverdue.length}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-600 bg-blue-50 shadow-none">
                <CardContent className="pt-6">
                  <p className="text-[8px] font-black uppercase text-blue-600 mb-1">Prazos Hoje</p>
                  <p className="text-3xl font-black text-blue-600">{metrics.todayPrazos.length}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-black bg-zinc-50 shadow-none">
                <CardContent className="pt-6">
                  <p className="text-[8px] font-black uppercase text-zinc-500 mb-1">Carteira Ativa</p>
                  <p className="text-3xl font-black text-zinc-900">{metrics.activePortfolio.length}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <Card className="shadow-none border-zinc-100 overflow-hidden">
              <CardHeader><CardTitle className="text-xs font-black uppercase text-zinc-400">Distribuição de Casos</CardTitle></CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.segments} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                      {stats.segments.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card className="shadow-none border-zinc-100 overflow-hidden">
              <CardHeader><CardTitle className="text-xs font-black uppercase text-zinc-400">Performance por Responsável (Top 10)</CardTitle></CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.lawyersData} layout="vertical" margin={{ left: 50, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{fontSize: 10, fontWeight: 'bold'}} width={100} />
                    <Tooltip cursor={{fill: '#f4f4f5'}} />
                    <Bar dataKey="value" fill="#111827" radius={[0, 4, 4, 0]} />
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
