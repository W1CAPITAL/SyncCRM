"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ShieldAlert, CheckCircle, Clock, Target, UserCheck, Globe } from "lucide-react";
import { UnifiedMetrics } from "@/lib/metrics-engine";
import { cn } from "@/lib/utils";

interface AuditViewProps {
  metrics: UnifiedMetrics;
}

/**
 * DADOS DIRETOS DO GABINETE - MILESTONE V87
 */
const DIRECT_TRIBUNAL_DATA = [
  { name: "TJSP - São Paulo", value: 1396 },
  { name: "TJMG - Minas Gerais", value: 182 },
  { name: "TJRJ - Rio de Janeiro", value: 139 },
  { name: "TJPR - Paraná", value: 120 },
  { name: "TJGO - Goiás", value: 83 },
  { name: "TJSC - Santa Catarina", value: 75 },
  { name: "TJMT - Mato Grosso", value: 69 },
  { name: "TJBA - Bahia", value: 54 },
  { name: "TJPE - Pernambuco", value: 47 },
  { name: "TJPA - Pará", value: 44 },
  { name: "TJDF - Distrito Federal", value: 41 },
  { name: "TJCE - Ceará", value: 37 },
  { name: "TJRS - Rio Grande do Sul", value: 37 },
  { name: "TJES - Espírito Santo", value: 35 },
  { name: "TJMS - Mato Grosso do Sul", value: 32 },
  { name: "TJMA - Maranhão", value: 26 },
  { name: "TJAM - Amazonas", value: 20 },
  { name: "TJRN - Rio Grande do Norte", value: 19 },
  { name: "TJRO - Rondônia", value: 17 },
  { name: "TJAP - Amapá", value: 16 },
  { name: "TJAL - Alagoas", value: 13 },
  { name: "TJPB - Paraíba", value: 13 },
  { name: "TJTO - Tocantins", value: 12 },
  { name: "TJPI - Piauí", value: 8 },
  { name: "TJAC - Acre", value: 6 },
  { name: "TJRR - Roraima", value: 3 },
  { name: "TJSE - Sergipe", value: 1 },
];

export function AuditView({ metrics }: AuditViewProps) {
  const sortedAudits = useMemo(() => {
    return Object.values(metrics.lawyerAudit).sort((a, b) => b.total - a.total);
  }, [metrics.lawyerAudit]);

  // Utilizamos os dados passados diretamente pelo usuário para esta visualização estratégica
  const tribunalData = DIRECT_TRIBUNAL_DATA;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <header className="bg-white border-b px-10 py-8 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Auditoria & Inteligência Geográfica</h2>
          <p className="text-[10px] font-bold text-black uppercase tracking-widest mt-2">Gabinete de Performance | W1 Intelligence</p>
        </div>
        <div className="flex gap-3">
          <Badge className="bg-black text-white px-5 py-2 font-black rounded-xl text-[10px] uppercase shadow-lg border-none">V87 GEOGRAPHIC SHIELD</Badge>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 space-y-10 scroll-black">
        {/* Gráfico de Distribuição por Estados (Tribunais) com Dados Diretos */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black text-white rounded-lg shadow-md">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-black">Distribuição de Carteira por Estado</h3>
              <p className="text-[9px] font-bold text-black/40 uppercase">Análise de Volume Geográfico Baseada nos Dados Diretos do Gabinete</p>
            </div>
          </div>
          
          <Card className="rounded-[2.5rem] border-2 border-zinc-100 bg-white shadow-sm overflow-hidden p-8">
            <div className="h-[750px] w-full"> {/* Altura ajustada para 27 estados */}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tribunalData} layout="vertical" margin={{ left: 140, right: 40, top: 10, bottom: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#000000' }} 
                    width={160} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f4f4f5' }} 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '2px solid #000000', 
                      fontSize: '10px', 
                      fontWeight: '900',
                      textTransform: 'uppercase',
                      backgroundColor: '#ffffff',
                      color: '#000000'
                    }} 
                    itemStyle={{ color: '#000000' }}
                  />
                  <Bar dataKey="value" fill="#000000" radius={[0, 8, 8, 0]} barSize={20}>
                    {tribunalData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#000000" : index < 5 ? "#27272a" : "#71717a"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        <div className="h-px bg-zinc-100" />

        {/* Auditoria de Responsáveis */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black text-white rounded-lg shadow-md">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-black">Auditoria de Responsáveis Sênior</h3>
              <p className="text-[9px] font-bold text-black/40 uppercase">Ranking de Eficiência Operacional (Coluna N)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {sortedAudits.map((audit, idx) => (
              <Card key={idx} className="rounded-[2.5rem] border-2 border-zinc-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all group">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="p-8 bg-black text-white md:w-80 flex flex-col justify-between transition-colors group-hover:bg-zinc-900">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <UserCheck className="h-4 w-4 text-white" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Responsável</span>
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight leading-tight text-white">{audit.name}</h3>
                      </div>
                      <div className="mt-8">
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Total em Carteira</p>
                         <p className="text-4xl font-black text-white">{audit.total}</p>
                      </div>
                    </div>
                    
                    <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-white">
                      <div className="space-y-4">
                         <div className="flex justify-between items-end">
                           <span className="text-[10px] font-black text-black uppercase tracking-widest">Score de Eficiência</span>
                           <span className={cn(
                             "text-xl font-black",
                             audit.efficiency > 80 ? "text-black" : audit.efficiency > 50 ? "text-orange-600" : "text-red-600"
                           )}>{audit.efficiency}%</span>
                         </div>
                         <Progress value={audit.efficiency} className="h-3 bg-zinc-100" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-red-50 p-4 rounded-3xl border-2 border-red-100">
                            <p className="text-[8px] font-black text-red-600 uppercase mb-1 flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Críticos</p>
                            <p className="text-xl font-black text-red-600">{audit.reallyOverdue}</p>
                         </div>
                         <div className="bg-blue-50 p-4 rounded-3xl border-2 border-blue-100">
                            <p className="text-[8px] font-black text-blue-600 uppercase mb-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Hoje</p>
                            <p className="text-xl font-black text-blue-600">{audit.today}</p>
                         </div>
                      </div>

                      <div className="flex flex-col justify-center space-y-2">
                         <div className="flex items-center gap-2 text-[10px] font-black text-black uppercase">
                            <CheckCircle className="h-3 w-3 text-green-600" /> {audit.onTime} No Prazo
                         </div>
                         <div className={cn(
                           "p-4 rounded-2xl text-center font-black text-[9px] uppercase tracking-widest border-2",
                           audit.reallyOverdue > 5 ? "bg-red-600 text-white border-red-600" : "bg-white text-black border-zinc-100"
                         )}>
                           {audit.reallyOverdue > 5 ? "INTERVENÇÃO NECESSÁRIA" : "OPERAÇÃO SAUDÁVEL"}
                         </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {sortedAudits.length === 0 && (
              <div className="h-96 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                <Target className="h-20 w-20 text-black" />
                <div>
                  <p className="font-black text-black uppercase text-xs tracking-widest">Nenhum Responsável Identificado</p>
                  <p className="text-[10px] font-bold text-black uppercase">Sincronize sua planilha para gerar a auditoria</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      
      <div className="relative z-10 p-8 flex items-center gap-4 text-black font-black text-[9px] tracking-widest uppercase">
         <div className="h-px flex-1 bg-zinc-100"></div>
         W1 CAPITAL INTELLIGENCE PROTOCOL
         <div className="h-px flex-1 bg-zinc-100"></div>
      </div>
    </div>
  );
}
