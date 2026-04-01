import { NextResponse } from "next/server";
import { ApiError } from "@/lib/lattes/errors";
import {
  MAX_UPLOAD_SIZE_BYTES,
  convertLattesXmlBuffer
} from "@/lib/lattes/convert";
import type { ErrorResponse } from "@/lib/lattes/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_UPLOAD_SIZE_BYTES + 1_000_000) {
      throw new ApiError(
        413,
        "file_too_large",
        "O upload excede o limite permitido de 25 MB."
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiError(
        400,
        "missing_file",
        "Envie um arquivo XML da Plataforma Lattes no campo `file`."
      );
    }

    if (file.size === 0) {
      throw new ApiError(400, "empty_file", "O arquivo enviado está vazio.");
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new ApiError(
        413,
        "file_too_large",
        "O upload excede o limite permitido de 25 MB."
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const payload = await convertLattesXmlBuffer(buffer, file.name);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json<ErrorResponse>(
        {
          error: {
            code: error.code,
            message: error.message
          }
        },
        { status: error.status }
      );
    }

    return NextResponse.json<ErrorResponse>(
      {
        error: {
          code: "internal_error",
          message: "Falha interna durante a conversão do arquivo."
        }
      },
      { status: 500 }
    );
  }
}
