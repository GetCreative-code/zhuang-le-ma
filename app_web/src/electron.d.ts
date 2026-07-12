declare global {
  interface Window {
    electronAPI?: {
      executeScript: (data: { script: string; platform: string }) => Promise<{
        success: boolean;
        exitCode: number;
        output: string;
        errorOutput: string;
      }>;
      getPlatform: () => Promise<string>;
      onScriptOutput: (callback: (data: { type: string; data: string }) => void) => void;
      removeScriptOutputListener: () => void;
    };
  }
}

export {};
