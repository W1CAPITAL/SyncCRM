
"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Search, FileArchive, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DocumentsViewProps {
  data: any[];
  headers: string[];
}

export function DocumentsView({ data, headers }: DocumentsViewProps) {
  const [search, setSearch] = useState("");
  const clientIdx = 3; 
  const procIdx = 5;   

  const filteredDocs = useMemo(() => {
    return data.filter(row => {
      const vals = Object.values(row).join(" ").toLowerCase();
      const hasLink = vals.includes("http") || vals.includes("docs.google") || vals.includes(".pdf");
      if (!hasLink) return false;
      if (!search) return true;
      return vals.includes(search.toLowerCase());
    });
  }, [data, search]);

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b p-6 shrink-0 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Arquivo Digital</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Registros com documentos ou links identificados</p>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input className="h-9 pl-10 text-xs" placeholder="Buscar no arquivo..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((doc, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow bg-white border-zinc-200">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black uppercase text-zinc-900 truncate">
                        {String(doc[`col_${clientIdx}`] || "Anexo").toUpperCase()}
                      </h4>
                      <p className="text-[9px] font-bold text-zinc-400 truncate">
                        PROC: {String(doc[`col_${procIdx}`] || "---")}
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-50 rounded p-2 text-[9px] font-mono text-zinc-500 break-all h-12 overflow-hidden">
                    Link/Anexo identificado automaticamente na planilha.
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[9px] font-bold flex-1">
                      <ExternalLink className="h-3 w-3 mr-1.5" /> ABRIR
                    </Button>
                    <Button size="sm" className="h-8 text-[9px] font-bold bg-zinc-900 text-white flex-1">
                      <Download className="h-3 w-3 mr-1.5" /> BAIXAR
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full h-96 flex flex-col items-center justify-center text-center space-y-4">
              <FileArchive className="h-12 w-12 text-zinc-200" />
              <p className="text-zinc-400 font-black uppercase text-xs tracking-widest">Nenhum documento digital encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
