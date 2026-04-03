import { ConversionError } from "@/lib/lattes/errors";
import { MAX_UPLOAD_SIZE_BYTES, convertLattesXmlBytes } from "@/lib/lattes/convert";
import type {
  WorkerConvertRequest,
  WorkerConvertResponse,
  WorkerConvertSuccess
} from "@/lib/lattes/worker-protocol";
import type { ConversionResponse } from "@/lib/lattes/types";

const WORKER_SOURCE = new URL("./worker-entry.ts", import.meta.url);

export async function convertLattesXmlFile(file: File): Promise<ConversionResponse> {
  validateFile(file);
  const buffer = await file.arrayBuffer();

  try {
    return await convertViaWorker(buffer, file.name);
  } catch (error) {
    logClientConversionError(error);

    if (shouldFallbackToMainThread(error)) {
      console.warn(
        "[lattes2bibtex] Worker conversion failed. Falling back to main-thread conversion.",
        error
      );
      return convertLattesXmlBytes(buffer, file.name);
    }

    throw normalizeClientError(error);
  }
}

async function convertViaWorker(
  buffer: ArrayBuffer,
  fileName: string
): Promise<ConversionResponse> {
  if (typeof Worker === "undefined") {
    throw new ConversionError(
      503,
      "worker_unavailable",
      "O ambiente atual não suporta o worker de conversão."
    );
  }

  return new Promise<ConversionResponse>((resolve, reject) => {
    let worker: Worker | undefined;

    try {
      worker = new Worker(WORKER_SOURCE, { type: "module" });
    } catch {
      reject(
        new ConversionError(
          503,
          "worker_bootstrap_failed",
          "Não foi possível inicializar o worker de conversão."
        )
      );
      return;
    }

    const cleanup = () => {
      worker?.removeEventListener("message", onMessage as EventListener);
      worker?.removeEventListener("error", onError as EventListener);
      worker?.terminate();
    };

    const onMessage = (event: MessageEvent<WorkerConvertResponse>) => {
      cleanup();

    if (event.data.type === "success") {
      resolve((event.data as WorkerConvertSuccess).payload);
      return;
    }

      reject(
        new ConversionError(
          event.data.error.code === "worker_internal_error" ? 503 : 422,
          event.data.error.code,
          event.data.error.message
        )
      );
    };

    const onError = () => {
      cleanup();
      reject(
        new ConversionError(
          503,
          "worker_runtime_failed",
          "O worker de conversão falhou durante a inicialização."
        )
      );
    };

    worker.addEventListener("message", onMessage as EventListener);
    worker.addEventListener("error", onError as EventListener);

    const workerBuffer = buffer.slice(0);
    const message: WorkerConvertRequest = {
      type: "convert",
      fileName,
      buffer: workerBuffer
    };

    try {
      worker.postMessage(message, [workerBuffer]);
    } catch {
      cleanup();
      reject(
        new ConversionError(
          503,
          "worker_post_message_failed",
          "Não foi possível enviar o arquivo para o worker de conversão."
        )
      );
    }
  });
}

function validateFile(file: File) {
  if (!file) {
    throw new ConversionError(
      400,
      "missing_file",
      "Envie um arquivo XML da Plataforma Lattes no campo `file`."
    );
  }

  if (file.size === 0) {
    throw new ConversionError(400, "empty_file", "O arquivo enviado está vazio.");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new ConversionError(
      413,
      "file_too_large",
      "O upload excede o limite permitido de 25 MB."
    );
  }
}

function shouldFallbackToMainThread(error: unknown): error is ConversionError {
  return (
    error instanceof ConversionError &&
    (error.code === "worker_unavailable" ||
      error.code === "worker_bootstrap_failed" ||
      error.code === "worker_post_message_failed" ||
      error.code === "worker_runtime_failed" ||
      error.code === "worker_internal_error" ||
      error.code === "invalid_worker_message")
  );
}

function normalizeClientError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new ConversionError(
    500,
    "client_conversion_error",
    "Não foi possível concluir a conversão."
  );
}

function logClientConversionError(error: unknown) {
  if (error instanceof Error) {
    console.error("[lattes2bibtex] Conversion failed.", error);
    return;
  }

  console.error("[lattes2bibtex] Conversion failed with a non-Error throwable.", error);
}
