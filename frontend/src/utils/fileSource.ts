const fileSourceStore = new WeakMap<File, string>();

const SOURCE_KEY = '__sourcePath';

const definePathProperty = (file: File, source: string) => {
  try {
    Object.defineProperty(file, 'path', {
      value: source,
      configurable: true,
      writable: false,
      enumerable: false,
    });
  } catch {
    try {
      (file as any).path = source;
    } catch {
      // ignore
    }
  }
  try {
    (file as any)[SOURCE_KEY] = source;
  } catch {
    // ignore
  }
};

export const rememberSourcePath = (file: File, source?: string | null) => {
  if (!file || !source) return;
  const normalized = source.toString();
  fileSourceStore.set(file, normalized);
  definePathProperty(file, normalized);
};

export const getFileSourcePath = (file: File): string => {
  const remembered = fileSourceStore.get(file);
  if (remembered) return remembered;

  const anyFile = file as any;
  const path =
    anyFile?.[SOURCE_KEY] ||
    anyFile?.webkitRelativePath ||
    anyFile?.path ||
    '';

  if (path) {
    const normalized = path.toString();
    rememberSourcePath(file, normalized);
    return normalized;
  }

  return '';
};

export const clearRememberedSource = (file: File) => {
  if (!file) return;
  fileSourceStore.delete(file);
  try {
    delete (file as any)[SOURCE_KEY];
  } catch {
    // ignore
  }
};

