import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AnalyzeMessage,
  AnalyzeResponse,
  FileAnalysisResult,
  SerializableWorkerFile,
} from '../workers/types';
import { getFileSourcePath } from '../utils/fileSource';

type AnalyzeOptions = {
  files: File[];
  autoDataMode: 'mod' | 'mod-1' | 'folder';
};

type WorkerRef = {
  worker: Worker;
  requestId: number;
  resolver: ((value: AnalyzeResponse['payload']) => void) | null;
  rejecter: ((reason?: unknown) => void) | null;
  pendingFiles: File[];
};

type WorkerResult = {
  analyses: FileAnalysisResult[];
  mesAnoByFile: string[];
};

function toSerializable(files: File[]): SerializableWorkerFile[] {
  return files.map((file, index) => {
    const path = getFileSourcePath(file);
    const anyFile = file as unknown as { webkitRelativePath?: string };
    return {
      index,
      name: file.name,
      lastModified: file.lastModified,
      size: file.size,
      path: path || undefined,
      webkitRelativePath: anyFile.webkitRelativePath,
    };
  });
}

export function useFileAnalysisWorker() {
  const [loading, setLoading] = useState(false);
  const ref = useRef<WorkerRef | null>(null);

  const ensureWorker = useCallback(() => {
    if (ref.current?.worker) {
      return ref.current.worker;
    }

    const worker = new Worker(new URL('../workers/fileAnalysisWorker.ts', import.meta.url), {
      type: 'module',
    });

    const bucket: WorkerRef = {
      worker,
      requestId: 0,
      resolver: null,
      rejecter: null,
      pendingFiles: [],
    };

    worker.addEventListener('message', (event: MessageEvent<AnalyzeResponse>) => {
      const message = event.data;
      if (!message || message.type !== 'analysis-result') {
        return;
      }
      if (!bucket.resolver || message.requestId !== bucket.requestId) {
        return;
      }
      bucket.resolver(message.payload);
      bucket.resolver = null;
      bucket.rejecter = null;
    });

    worker.addEventListener('error', (error) => {
      if (bucket.rejecter) {
        bucket.rejecter(error);
      }
      bucket.resolver = null;
      bucket.rejecter = null;
    });

    ref.current = bucket;
    return worker;
  }, []);

  const analyzeFiles = useCallback(async ({ files, autoDataMode }: AnalyzeOptions): Promise<WorkerResult> => {
    if (files.length === 0) {
      setLoading(false);
      return { analyses: [], mesAnoByFile: [] };
    }

    const worker = ensureWorker();
    if (!ref.current) {
      return { analyses: [], mesAnoByFile: [] };
    }

    const current = ref.current;

    if (current.rejecter) {
      current.rejecter(new Error('cancelled'));
      current.resolver = null;
      current.rejecter = null;
    }

    current.requestId += 1;
    const requestId = current.requestId;
    const serializable = toSerializable(files);

    const message: AnalyzeMessage = {
      type: 'analyze',
      requestId,
      payload: {
        files: serializable,
        autoDataMode,
      },
    };

    const analysisPromise = new Promise<AnalyzeResponse['payload']>((resolve, reject) => {
      current.resolver = resolve;
      current.rejecter = reject;
    });

    current.pendingFiles = [...files];
    setLoading(true);
    worker.postMessage(message);

    try {
      const payload = await analysisPromise;
      const mapped: FileAnalysisResult[] = payload.analyses
        .map((item) => {
          const file = current.pendingFiles[item.index];
          if (!file) {
            return null;
          }
          return {
            file,
            tipoDetectado: item.tipoDetectado,
            dataDetectada: item.dataDetectada,
            confianca: item.confianca,
            motivo: item.motivo,
          } as FileAnalysisResult;
        })
        .filter((entry): entry is FileAnalysisResult => entry !== null);

      return {
        analyses: mapped,
        mesAnoByFile: payload.mesAnoByFile,
      };
    } finally {
      setLoading(false);
      current.pendingFiles = [];
      current.resolver = null;
      current.rejecter = null;
    }
  }, [ensureWorker]);

  useEffect(() => {
    return () => {
      ref.current?.worker.terminate();
      ref.current = null;
    };
  }, []);

  return {
    analyzeFiles,
    analyzing: loading,
  };
}
