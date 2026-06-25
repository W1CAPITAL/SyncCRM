
"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2, Sparkles, CheckCircle2, FileUp, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Gerador de Documentos V51 Elite Cloudflare Fix.
 * Utiliza importações dinâmicas e isolamento total para evitar erro de 'super' keyword.
 */
export function DocGeneratorView() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      toast({ variant: "destructive", title: "Formato Inválido", description: "Selecione um PDF." });
      return;
    }

    setIsPdfLoading(true);
    try {
      // Importação dinâmica para evitar erro de build no Cloudflare
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = "";

      // V51 Elite: Lemos apenas as páginas iniciais para extração cirúrgica de qualificação
      const maxPages = Math.min(pdf.numPages, 3);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => (item as any).str).join(" ");
        fullText += pageText + "\n";
      }

      setInput(fullText);
      toast({ title: "PDF Processado", description: "Dados prontos para extração cirúrgica." });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro no PDF", description: "Falha ao processar arquivo." });
    } finally {
      setIsPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGenerateDoc = async () => {
    if (!input.trim() || isProcessing) return;
    setIsProcessing(true);
    setExtractedData(null);

    try {
      const response = await fetch('/api/generate-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dadosBrutos: input })
      });

      const data = await response.json();
      if (data.success) {
        setExtractedData(data.dados);
        toast({ title: "Extração Concluída", description: "V51 Elite filtragem cirúrgica finalizada." });
      } else {
        toast({ variant: "destructive", title: "IA Falhou", description: data.error });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Falha de Conexão" });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadDocx = async () => {
    if (!extractedData || isDownloading) return;
    setIsDownloading(true);

    try {
      // Importação dinâmica absoluta para isolar o erro de 'super' keyword
      const docx = await import("docx");
      const fileSaver = await import("file-saver");
      const { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType } = docx;

      const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "PROCURAÇÃO “AD JUDICIA”",
                  bold: true,
                  size: 24,
                  font: "Arial"
                }),
              ],
              spacing: { after: 400 },
            }),
            new Paragraph({
              alignment: AlignmentType.JUSTIFY,
              children: [
                new TextRun({ text: extractedData.nome.toUpperCase(), bold: true, font: "Arial" }),
                new TextRun({ text: `, ${extractedData.nacionalidade}, ${extractedData.estadoCivil}, ${extractedData.profissao}, portador do RG nº `, font: "Arial" }),
                new TextRun({ text: extractedData.rg, bold: true, font: "Arial" }),
                new TextRun({ text: ` e CPF nº `, font: "Arial" }),
                new TextRun({ text: extractedData.cpf, bold: true, font: "Arial" }),
                new TextRun({ text: `, residente em `, font: "Arial" }),
                new TextRun({ text: extractedData.endereco, bold: true, font: "Arial" }),
                new TextRun({ text: `, com e-mail: `, font: "Arial" }),
                new TextRun({ text: extractedData.email || "NÃO INFORMADO", bold: true, font: "Arial" }),
                new TextRun({ text: `, nomeia seu procurador:`, font: "Arial" }),
              ],
              spacing: { after: 300, line: 360 },
            }),
            new Paragraph({
              alignment: AlignmentType.JUSTIFY,
              children: [
                new TextRun({ text: "DIEGO GOMES DIAS", bold: true, font: "Arial" }),
                new TextRun({ text: ", advogado, OAB/SP 370.898, com endereço na Av. São Miguel, nº 4810 – Jardim Cotinha – São Paulo – SP, e-mail: diego_gomesdias@yahoo.com.br.", font: "Arial" }),
              ],
              spacing: { after: 300, line: 360 },
            }),
            new Paragraph({
              alignment: AlignmentType.JUSTIFY,
              children: [
                new TextRun({ text: "PODERES: ", bold: true, font: "Arial" }),
                new TextRun({ text: "Confere amplos poderes para o foro em geral, com a cláusula “AD JUDICIA”, especialmente para agir nos autos da ", font: "Arial" }),
                new TextRun({ 
                  text: "AÇÃO DE REVISÃO CONTRATUAL COM PEDIDO DE TUTELA DE URGÊNCIA", 
                  bold: true, 
                  underline: { type: UnderlineType.SINGLE },
                  font: "Arial" 
                }),
                new TextRun({ text: " contra o ", font: "Arial" }),
                new TextRun({ text: extractedData.bancoReu.toUpperCase(), bold: true, font: "Arial" }),
                new TextRun({ text: `, CNPJ nº ${extractedData.cnpjReu}.`, bold: true, font: "Arial" }),
              ],
              spacing: { after: 600, line: 360 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `São Paulo, ${dataAtual}.`, font: "Arial" }),
              ],
              spacing: { after: 800 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "________________________________________________", font: "Arial" }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: extractedData.nome.toUpperCase(), bold: true, font: "Arial" }),
              ],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      fileSaver.saveAs(blob, `Procuracao_${extractedData.nome.replace(/\s/g, '_')}.docx`);
      toast({ title: "Documento Gerado", description: "O download iniciou automaticamente." });
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro na Geração", description: "Falha ao compilar o DOCX." });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b p-6 shadow-sm shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">Gerador de Documentos</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">V51 Elite Engine | Extração Cirúrgica de PDF</p>
          </div>
          <div className="flex gap-2">
            <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <Button variant="outline" className="font-black text-[10px] h-10 border-zinc-200" onClick={() => fileInputRef.current?.click()} disabled={isPdfLoading}>
              {isPdfLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="h-4 w-4 mr-2" />}
              SUBIR PDF
            </Button>
            <Badge variant="outline" className="border-zinc-900 bg-zinc-900 text-white font-black">V51 ELITE</Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-black">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-2 shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-zinc-900 text-white p-6">
              <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Base de Dados (Texto ou PDF)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <Textarea 
                placeholder="Cole o contrato ou suba um PDF acima. O sistema filtrará apenas os dados de qualificação." 
                className="min-h-[150px] font-medium text-xs border-2" 
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <Button className="w-full h-14 bg-zinc-900 text-white font-black shadow-lg hover:bg-zinc-800 transition-all" onClick={handleGenerateDoc} disabled={isProcessing || !input.trim()}>
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2 text-amber-500" />}
                GERAR MINUTA AUTOMÁTICA
              </Button>
            </CardContent>
          </Card>

          {extractedData && (
            <Card className="border-2 border-green-200 shadow-xl bg-white overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <CardHeader className="bg-green-50 p-6">
                <CardTitle className="text-sm font-black uppercase tracking-tight text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Conferência V51 Elite
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-zinc-50 rounded-xl border-2">
                       <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Banco Réu</p>
                       <p className="text-sm font-black text-zinc-900 uppercase">{extractedData.bancoReu}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 rounded-xl border-2">
                       <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">CNPJ (Validado)</p>
                       <p className="text-sm font-black text-zinc-900">{extractedData.cnpjReu}</p>
                    </div>
                 </div>
                 <div className="bg-white p-8 border-2 rounded-xl shadow-inner text-sm font-serif leading-relaxed text-zinc-800 h-80 overflow-y-auto scroll-black">
                    <p className="text-center font-bold uppercase underline mb-6 text-lg">PROCURAÇÃO “AD JUDICIA”</p>
                    <p className="mb-4"><strong>{extractedData.nome.toUpperCase()}</strong>, {extractedData.nacionalidade}, {extractedData.estadoCivil}, {extractedData.profissao}, portador do RG nº <strong>{extractedData.rg}</strong> e CPF nº <strong>{extractedData.cpf}</strong>, residente em <strong>{extractedData.endereco}</strong>...</p>
                    <p className="mb-4"><strong>DIEGO GOMES DIAS</strong>, advogado, OAB/SP 370.898...</p>
                    <p className="mb-4"><strong>PODERES:</strong> ... agir nos autos da <span className="underline font-bold">AÇÃO DE REVISÃO CONTRATUAL COM PEDIDO DE TUTELA DE URGÊNCIA</span> contra o <strong>{extractedData.bancoReu.toUpperCase()}</strong>...</p>
                 </div>
              </CardContent>
              <CardFooter className="p-6 bg-green-50 border-t-2">
                <Button className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black shadow-lg" onClick={downloadDocx} disabled={isDownloading}>
                  {isDownloading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Download className="h-5 w-5 mr-2" />}
                  BAIXAR PROCURAÇÃO (.DOCX)
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
