/// <reference lib="webworker" />

import type { AnalyzeMessage, AnalyzeResponse, SerializableWorkerFile, WorkerAnalysis } from './types';
import { extractYearMonthFromPath } from '../utils/extractYearMonthFromPath';

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

function computeMesAnoFromFile(file: SerializableWorkerFile, mode: 'mod' | 'mod-1' | 'folder'): string {
  try {
    if (mode === 'folder') {
      const rawPath = (file.webkitRelativePath || file.path || '').toString();
      return extractYearMonthFromPath(rawPath);
    }

    const date = new Date(file.lastModified || Date.now());
    if (mode === 'mod-1') {
      date.setMonth(date.getMonth() - 1);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } catch {
    return '';
  }
}

function getPreviousMonth(): string {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function analyzeFile(file: SerializableWorkerFile): WorkerAnalysis {
  const nome = file.name.toLowerCase();
  const nomeNorm = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const tokens = nomeNorm.match(/[a-z0-9]+/g) || [];
  const tokenSet = new Set(tokens);

  let tipoDetectado = '';
  let dataDetectada = '';
  let confianca = 0;
  let motivo = '';

  const regexDataFatura = /^(\d{4})-(\d{2})\.(pdf|xlsm|xlsx?|docx?)$/i;
  const matchFatura = nome.match(regexDataFatura);
  if (matchFatura) {
    tipoDetectado = 'FAT';
    dataDetectada = `${matchFatura[1]}-${matchFatura[2]}`;
    confianca = 95;
    motivo = `Fatura detectada: nome contem apenas data (${dataDetectada})`;
  } else if (
    tokenSet.has('nota') ||
    tokenSet.has('cpc') ||
    tokenSet.has('lpc') ||
    tokenSet.has('cp') ||
    tokenSet.has('lp') ||
    tokenSet.has('venda') ||
    tokenSet.has('ve')
  ) {
    if (tokenSet.has('cpc')) {
      tipoDetectado = 'NE-CPC';
      motivo = 'Nota de Energia CPC: token "cpc"';
    } else if (tokenSet.has('lpc')) {
      tipoDetectado = 'NE-LPC';
      motivo = 'Nota de Energia LPC: token "lpc"';
    } else if (tokenSet.has('cp')) {
      tipoDetectado = 'NE-CP';
      motivo = 'Nota de Energia CP: token "cp"';
    } else if (tokenSet.has('lp')) {
      tipoDetectado = 'NE-LP';
      motivo = 'Nota de Energia LP: token "lp"';
    } else if (tokenSet.has('venda') || tokenSet.has('ve')) {
      tipoDetectado = 'NE-VE';
      motivo = 'Nota de Energia Venda: token "venda/ve"';
    } else {
      tipoDetectado = 'NE-CP';
      motivo = 'Nota de Energia: token "nota"';
    }

    const dataMod = new Date(file.lastModified);
    dataMod.setMonth(dataMod.getMonth() - 1);
    const ano = dataMod.getFullYear();
    const mes = String(dataMod.getMonth() + 1).padStart(2, '0');
    dataDetectada = `${ano}-${mes}`;
    confianca = 85;
    motivo += ` - Data: modificacao menos 1 mes (${dataDetectada})`;
  } else if (nome.includes('devec') || nome.includes('ldo') || nome.includes('rec')) {
    const dataMod = new Date(file.lastModified);
    dataMod.setMonth(dataMod.getMonth() - 1);
    const ano = dataMod.getFullYear();
    const mes = String(dataMod.getMonth() + 1).padStart(2, '0');
    dataDetectada = `${ano}-${mes}`;
    confianca = 85;
    if (nome.includes('devec')) {
      tipoDetectado = 'ICMS-DEVEC';
      motivo = 'ICMS-DEVEC detectado no nome - usando mes anterior';
    } else if (nome.includes('ldo')) {
      tipoDetectado = 'ICMS-LDO';
      motivo = 'ICMS-LDO detectado no nome - usando mes anterior';
    } else {
      tipoDetectado = 'ICMS-REC';
      motivo = 'ICMS-REC detectado no nome - usando mes anterior';
    }
  } else if (nome.includes('estudo')) {
    tipoDetectado = 'EST';
    const dataMod = new Date(file.lastModified);
    const ano = dataMod.getFullYear();
    const mes = String(dataMod.getMonth() + 1).padStart(2, '0');
    dataDetectada = `${ano}-${mes}`;
    confianca = 90;
    motivo = 'Estudo detectado: nome contem "estudo" - usando data de modificacao';
  } else if (
    (tokenSet.has('carta') && tokenSet.has('denuncia')) ||
    tokenSet.has('aditivo') ||
    tokenSet.has('contrato') ||
    tokenSet.has('procuracao') || nomeNorm.includes('procuracao') ||
    tokenSet.has('cadastro') ||
    tokenSet.has('comunicado') ||
    tokenSet.has('licenca') || nomeNorm.includes('licenca')
  ) {
    const dataMod = new Date(file.lastModified);
    const ano = dataMod.getFullYear();
    const mes = String(dataMod.getMonth() + 1).padStart(2, '0');
    dataDetectada = `${ano}-${mes}`;
    confianca = 90;

    const isMinuta = tokenSet.has('minuta') || tokenSet.has('minutas') || tokenSet.has('min');
    const pref = isMinuta ? 'MIN' : 'DOC';

    if (tokenSet.has('carta') && tokenSet.has('denuncia')) {
      tipoDetectado = `${pref}-CAR`;
      motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Carta denuncia" - usando mes/ano da modificacao`;
    } else if (tokenSet.has('aditivo')) {
      tipoDetectado = `${pref}-ADT`;
      motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Aditivo" - usando mes/ano da modificacao`;
    } else if (tokenSet.has('contrato')) {
      tipoDetectado = `${pref}-CTR`;
      motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Contrato" - usando mes/ano da modificacao`;
    } else if (tokenSet.has('procuracao') || nomeNorm.includes('procuracao')) {
      tipoDetectado = `${pref}-PRO`;
      motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Procuracao" - usando mes/ano da modificacao`;
    } else if (tokenSet.has('cadastro')) {
      tipoDetectado = `${pref}-CAD`;
      motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Cadastro" - usando mes/ano da modificacao`;
      confianca = 70;
    } else if (tokenSet.has('comunicado')) {
      tipoDetectado = `${pref}-COM`;
      motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Comunicado" - usando mes/ano da modificacao`;
      confianca = 70;
    } else if (tokenSet.has('licenca') || nomeNorm.includes('licenca')) {
      tipoDetectado = `${pref}-LIC`;
      motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Licenca" - usando mes/ano da modificacao`;
      confianca = 70;
    }
  } else if (nome.includes('relatorio') || nomeNorm.includes('relatorio')) {
    tipoDetectado = 'REL';
    const regexDataRelatorio = /(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)-(\d{2})/i;
    const matchRelatorio = nome.match(regexDataRelatorio);

    if (matchRelatorio) {
      const mesNome = matchRelatorio[1].toLowerCase();
      const ano20 = matchRelatorio[2];
      const meses: Record<string, string> = {
        jan: '01', fev: '02', mar: '03', abr: '04',
        mai: '05', jun: '06', jul: '07', ago: '08',
        set: '09', out: '10', nov: '11', dez: '12',
      };
      const mesNum = meses[mesNome];
      const anoCompleto = `20${ano20}`;
      dataDetectada = `${anoCompleto}-${mesNum}`;
      confianca = 90;
      motivo = `Relatorio detectado: nome contem "relatorio" e data ${matchRelatorio[0].toUpperCase()}`;
    } else {
      dataDetectada = getPreviousMonth();
      confianca = 70;
      motivo = 'Relatorio detectado: nome contem "relatorio" - usando mes anterior';
    }
  } else {
    tipoDetectado = '';
    dataDetectada = '';
    confianca = 0;
    motivo = 'Tipo nao identificado - selecao manual necessaria';
  }

  return {
    index: file.index,
    tipoDetectado,
    dataDetectada,
    confianca,
    motivo,
  };
}

ctx.addEventListener('message', (event: MessageEvent<AnalyzeMessage>) => {
  const data = event.data;
  if (!data || data.type !== 'analyze') {
    return;
  }

  const { files, autoDataMode } = data.payload;
  const analyses = files.map((file) => analyzeFile(file));
  const mesAnoByFile = files.map((file) => computeMesAnoFromFile(file, autoDataMode));

  const response: AnalyzeResponse = {
    type: 'analysis-result',
    requestId: data.requestId,
    payload: {
      analyses,
      mesAnoByFile,
    },
  };

  ctx.postMessage(response);
});
