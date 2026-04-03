import { handleWorkerConvertRequest } from "@/lib/lattes/worker-core";
import { isWorkerConvertRequest } from "@/lib/lattes/worker-protocol";

self.addEventListener("message", async (event: MessageEvent<unknown>) => {
  if (!isWorkerConvertRequest(event.data)) {
    self.postMessage({
      type: "error",
      error: {
        code: "invalid_worker_message",
        message: "Mensagem inválida enviada ao worker de conversão."
      }
    });
    return;
  }

  const response = await handleWorkerConvertRequest(event.data);
  self.postMessage(response);
});
