import { ConversionError } from "@/lib/lattes/errors";
import { convertLattesXmlBytes } from "@/lib/lattes/convert";
import type {
  WorkerConvertError,
  WorkerConvertRequest,
  WorkerConvertResponse
} from "@/lib/lattes/worker-protocol";

export async function handleWorkerConvertRequest(
  request: WorkerConvertRequest
): Promise<WorkerConvertResponse> {
  try {
    const payload = await convertLattesXmlBytes(request.buffer, request.fileName);
    return {
      type: "success",
      payload
    };
  } catch (error) {
    console.error("[lattes2bibtex] Worker conversion failed.", error);
    return {
      type: "error",
      error: toWorkerError(error)
    };
  }
}

export function toWorkerError(error: unknown): WorkerConvertError["error"] {
  if (error instanceof ConversionError) {
    return {
      code: error.code,
      message: error.message
    };
  }

  return {
    code: "worker_internal_error",
    message: "Falha interna durante a conversão do arquivo."
  };
}
