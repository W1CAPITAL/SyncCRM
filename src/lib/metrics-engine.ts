import { startOfDay, isBefore, isToday, isValid, parse, subDays } from "date-fns";

/**
 * MOTOR DE MÉTRICAS TÁTICAS V53 ELITE
 * FOCO: SEGREGAÇÃO RIGOROSA COLUNA N (PRÓXIMO) VS COLUNA M (RETORNO)
 */

export interface LawyerAuditStats {
  name: string;
  total: number;
  reallyOverdue: number;
  commonOverdue: number;
  today: number;
  onTime: number;
  efficiency: number;
}

export interface UnifiedMetrics {
  total: number;
  activePortfolio: any[];
  reallyOverdue: any[]; 
  commonOverdue: any[]; 
  onTimePrazos: any[]; 
  todayPrazos: any[];
  closedWithAppointment: any[];
  historyCount: number; 
  efficiencyScore: number;
  lawyersPerformance: Record<string, number>;
  lawyerAudit: Record<string, LawyerAuditStats>;
  tribunaisVolume: Record<string, number>;
}

const CRITICAL_KEYWORDS = ["URGENTE", "LIMINAR", "BLOQUEIO", "CRÍTICO", "CRITICO", "PRIORIDADE", "MULTA", "BUSCA", "APREENSÃO", "EXPEDIÇÃO"];
const INACTIVE_KEYWORDS = ["ENCERRADO", "ARQUIVADO", "BAIXADO", "FINALIZADO", "EXTINTO", "SUSPENSO", "SOBRESTADO", "JULGADO", "CANCELADO", "INATIVO", "SUCUMBENCIA"];

export function extractTribunal(protocol: string): string {
  if (!protocol) return "Não Identificado";
  const match = protocol.match(/\.8\.(\d{2})\./);
  if (!match) return "Outros";

  const cnjMap: Record<string, string> = {
    '01': 'TJAC', '02': 'TJAL', '03': 'TJAM', '04': 'TJAP', '05': 'TJBA',
    '06': 'TJCE', '07': 'TJDFT', '08': 'TJES', '09': 'TJGO', '10': 'TJMA',
    '11': 'TJMT', '12': 'TJMS', '13': 'TJMG', '14': 'TJPA', '15': 'TJPB',
    '16': 'TJPR', '17': 'TJPE', '18': 'TJPI', '19': 'TJRJ', '20': 'TJRN',
    '21': 'TJRS', '22': 'TJRO', '23': 'TJRR', '24': 'TJSC', '25': 'TJSE',
    '26': 'TJSP', '27': 'TJTO'
  };
  return cnjMap[match[1]] || "Outros";
}

export function parseV51Date(value: any) {
  if (!value || value === "0" || String(value).trim() === "") return null;
  const str = String(value).trim().split(' ')[0];
  const dateRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4})$|^(\d{4}-\d{1,2}-\d{1,2})$/;
  if (!dateRegex.test(str)) return null;

  try {
    let date;
    if (str.includes("/")) {
      const parts = str.split("/");
      if (parts[2].length === 2) {
        date = parse(str, 'dd/MM/yy', new Date());
      } else {
        date = parse(str, 'dd/MM/yyyy', new Date());
      }
    } else {
      date = new Date(str);
    }
    if (!isValid(date) || date.getFullYear() < 2000 || date.getFullYear() > 2100) return null;
    return startOfDay(date);
  } catch { return null; }
}

export function calculateV51Metrics(data: any[], indices: any): UnifiedMetrics {
  const today = startOfDay(new Date());
  const criticalLimit = subDays(today, 5);
  
  const results: UnifiedMetrics = {
    total: data.length,
    activePortfolio: [],
    reallyOverdue: [],
    commonOverdue: [],
    onTimePrazos: [],
    todayPrazos: [],
    closedWithAppointment: [],
    historyCount: 0,
    efficiencyScore: 0,
    lawyersPerformance: {},
    lawyerAudit: {},
    tribunaisVolume: {}
  };

  data.forEach(row => {
    const rowValues = Object.values(row).map(v => String(v).toUpperCase());
    const rowString = rowValues.join(" ");
    const isInactive = INACTIVE_KEYWORDS.some(k => rowString.includes(k));

    if (isInactive) {
      results.historyCount++;
      const proximoVal = row[`col_${indices.nextDate}`];
      const hasDate = parseV51Date(proximoVal);
      if (hasDate) results.closedWithAppointment.push(row);
      return;
    }

    results.activePortfolio.push(row);

    const adv = String(row[`col_${indices.lawyer}`] || "NÃO IDENTIFICADO").toUpperCase().trim();
    if (adv && adv !== "0" && adv !== "") {
      results.lawyersPerformance[adv] = (results.lawyersPerformance[adv] || 0) + 1;
      
      if (!results.lawyerAudit[adv]) {
        results.lawyerAudit[adv] = { name: adv, total: 0, reallyOverdue: 0, commonOverdue: 0, today: 0, onTime: 0, efficiency: 0 };
      }
      results.lawyerAudit[adv].total++;
    }

    const cnj = String(row[`col_${indices.process}`] || "");
    const tj = extractTribunal(cnj);
    results.tribunaisVolume[tj] = (results.tribunaisVolume[tj] || 0) + 1;

    if (indices.nextDate !== -1) {
      const proximoVal = row[`col_${indices.nextDate}`];
      const proximoDate = parseV51Date(proximoVal);
      
      if (proximoDate !== null) {
        if (isBefore(proximoDate, today)) {
          const isCriticalTerm = CRITICAL_KEYWORDS.some(k => rowString.includes(k));
          const isSuspended = String(row[`col_${indices.suspended}`] || "").toLowerCase() === "sim" || String(row[`col_${indices.suspended}`] || "").toLowerCase() === "true";
          
          if (isBefore(proximoDate, criticalLimit) || isCriticalTerm || isSuspended) {
            results.reallyOverdue.push(row);
            if (results.lawyerAudit[adv]) results.lawyerAudit[adv].reallyOverdue++;
          } else {
            results.commonOverdue.push(row);
            if (results.lawyerAudit[adv]) results.lawyerAudit[adv].commonOverdue++;
          }
        } else if (isToday(proximoDate)) {
          results.todayPrazos.push(row);
          if (results.lawyerAudit[adv]) results.lawyerAudit[adv].today++;
        } else {
          results.onTimePrazos.push(row);
          if (results.lawyerAudit[adv]) results.lawyerAudit[adv].onTime++;
        }
      }
    }
  });

  // Calcula eficiência por advogado
  Object.values(results.lawyerAudit).forEach(audit => {
    const healthy = audit.onTime + audit.today;
    audit.efficiency = audit.total > 0 ? Math.round((healthy / audit.total) * 100) : 100;
  });

  if (results.activePortfolio.length > 0) {
    const healthyCases = results.onTimePrazos.length + results.todayPrazos.length;
    results.efficiencyScore = Math.round((healthyCases / results.activePortfolio.length) * 100);
  }

  return results;
}