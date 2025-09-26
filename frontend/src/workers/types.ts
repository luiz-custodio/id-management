export type SerializableWorkerFile = {
  index: number;
  name: string;
  lastModified: number;
  size: number;
  path?: string;
  webkitRelativePath?: string;
};

export type WorkerAnalysis = {
  index: number;
  tipoDetectado: string;
  dataDetectada: string;
  confianca: number;
  motivo: string;
};

export type FileAnalysisResult = {
  file: File;
  tipoDetectado: string;
  dataDetectada: string;
  confianca: number;
  motivo: string;
};

export type AnalyzeMessage = {
  type: 'analyze';
  requestId: number;
  payload: {
    files: SerializableWorkerFile[];
    autoDataMode: 'mod' | 'mod-1' | 'folder';
  };
};

export type AnalyzeResponse = {
  type: 'analysis-result';
  requestId: number;
  payload: {
    analyses: WorkerAnalysis[];
    mesAnoByFile: string[];
  };
};
