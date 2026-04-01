// @vitest-environment node

import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/lattes/convert";
import { readFixtureBuffer, readFixtureText } from "@/lib/test-utils/fixtures";
import { POST } from "@/app/api/convert/lattes-to-bibtex/route";

async function makeRequest(file?: File) {
  const formData = new FormData();
  if (file) {
    formData.set("file", file);
  }

  return POST(
    new Request("http://localhost/api/convert/lattes-to-bibtex", {
      method: "POST",
      body: formData
    })
  );
}

describe("POST /api/convert/lattes-to-bibtex", () => {
  it("returns converted bibtex for a valid sanitized fixture", async () => {
    const buffer = await readFixtureBuffer("real/sanitized-lattes.xml");
    const response = await makeRequest(
      new File([new Uint8Array(buffer)], "sanitized-lattes.xml", {
        type: "application/xml"
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filename).toBe("sanitized-lattes.bib");
    expect(data.bibtex).toContain("@article");
  });

  it("rejects invalid xml payloads", async () => {
    const response = await makeRequest(
      new File(["<not-closed"], "broken.xml", { type: "application/xml" })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("invalid_xml");
  });

  it("rejects XML files without CURRICULO-VITAE as the root element", async () => {
    const response = await makeRequest(
      new File(
        ['<?xml version="1.0" encoding="UTF-8"?><OUTRO-ELEMENTO />'],
        "wrong-root.xml",
        { type: "application/xml" }
      )
    );
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe("invalid_root_element");
  });

  it("rejects curricula without bibliographic content", async () => {
    const xml = await readFixtureText("synthetic/empty-bibliography.xml");
    const response = await makeRequest(
      new File([xml], "empty-bibliography.xml", { type: "application/xml" })
    );
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe("missing_bibliographic_content");
  });

  it("rejects oversized uploads", async () => {
    const oversized = new File(
      [new Uint8Array(Buffer.alloc(MAX_UPLOAD_SIZE_BYTES + 1, "a"))],
      "big.xml",
      {
        type: "application/xml"
      }
    );
    const response = await makeRequest(oversized);
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data.error.code).toBe("file_too_large");
  });
});
