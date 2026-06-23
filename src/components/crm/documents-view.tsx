
"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Link as LinkIcon, Download, Search, FileArchive, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DocumentsViewProps {
  data: any[];
  headers: string[];
}

export function DocumentsView({ data, headers }: DocumentsViewProps) {
  const clientIdx = 3; // Coluna D
  const procIdx = 5;   // Coluna F

  // Filtra apenas registros que parecem ter algo digital (ignora vazios)
  const docs = useMemo(() => {
    return data.filter(row => {
      const vals = Object.values(row).join(" ").toLowerCase();
      return vals.includes("http") || vals.includes(".pdf") || vals.includes(".doc");
    }).slice(0, 100);
  }, [data]);

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      <header className="bg-white border-b p-6 shrink-0 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Documentos Digital</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Repositório de links e anexos identificados</p>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input className="h-9 pl-10 text-xs" placeholder="Buscar documento..." />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {docs.length > 0 ? (
            docs.map((doc, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow border-zinc-200">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black uppercase text-zinc-900 truncate">
                        {String(doc[`col_${clientIdx}`] || "Arquivo S/ Nome").toUpperCase()}
                      </h4>
                      <p className="text-[10px] font-bold text-zinc-400 truncate">
                        PROC: {String(doc[`col_${procIdx}`] || "---")}
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-50 rounded p-3 text-[10px] font-mono text-zinc-600 break-all">
                    Identificado na base como documento digital vinculado ao processo.
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold flex-1">
                      <ExternalLink className="h-3 w-3 mr-2" /> ABRIR LINK
                    </Button>
                    <Button size="sm" className="h-8 text-[10px] font-bold bg-zinc-900 flex-1">
                      <Download className="h-3 w-3 mr-2" /> BAIXAR
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full h-96 flex flex-col items-center justify-center text-center space-y-4">
              <FileArchive className="h-12 w-12 text-zinc-200" />
              <p className="text-zinc-400 font-black uppercase text-xs tracking-widest">Nenhum documento digital encontrado na planilha atual.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
