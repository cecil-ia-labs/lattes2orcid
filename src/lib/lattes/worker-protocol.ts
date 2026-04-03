import type { ConversionResponse } from "@/lib/lattes/types";

export interface WorkerConvertRequest {
  type: "convert";
  fileName: string;
  buffer: ArrayBuffer;
}

export interface WorkerConvertSuccess {
  type: "success";
  payload: ConversionResponse;
}

export interface WorkerConvertError {
  type: "error";
  error: {
    code: string;
    message: string;
  };
}

export type WorkerConvertResponse = WorkerConvertSuccess | WorkerConvertError;

export function isWorkerConvertRequest(value: unknown): value is WorkerConvertRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<WorkerConvertRequest>;
  return (
    candidate.type === "convert" &&
    typeof candidate.fileName === "string" &&
    candidate.buffer instanceof ArrayBuffer
  );
}
