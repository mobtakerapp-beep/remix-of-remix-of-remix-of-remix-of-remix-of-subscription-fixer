/**
 * Export a DOM node to a multi-page A4 PDF.
 * Page cuts are moved back to the top of the nearest ".break-inside-avoid"
 * block, so a page always starts at the beginning of a question / section
 * and nothing is sliced in half.
 */
export async function exportNodeToPdf(node: HTMLElement, fileName: string) {
  await Promise.all(
    Array.from(node.querySelectorAll("img")).map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const scale = 2;
  const nodeRect = node.getBoundingClientRect();
  // Measure keep-together blocks before rasterizing, relative to the node top.
  const avoidBlocks = Array.from(node.querySelectorAll<HTMLElement>(".break-inside-avoid"))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: (rect.top - nodeRect.top) * scale,
        bottom: (rect.bottom - nodeRect.top) * scale,
      };
    })
    .filter((b) => b.bottom > b.top && b.bottom > 0)
    .sort((a, b) => a.top - b.top);

  node.classList.add("pdf-exporting");
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(node, {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: document.documentElement.clientWidth,
      onclone: (clonedDoc) => {
        clonedDoc.documentElement.classList.remove("dark");
        clonedDoc.body.classList.remove("dark");
        clonedDoc.body.style.background = "#ffffff";
      },
    });
  } finally {
    node.classList.remove("pdf-exporting");
  }
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const canvasPageHeight = (usableHeight * canvas.width) / usableWidth;

  const splitsBlock = (end: number, start: number) =>
    avoidBlocks.some((b) => b.top > start && b.top < end && b.bottom > end);

  const cuts: number[] = [0];
  let pageStart = 0;
  let guard = 0;
  while (pageStart < canvas.height && guard++ < 200) {
    const naturalEnd = pageStart + canvasPageHeight;
    if (naturalEnd >= canvas.height) break;

    // Prefer cutting at the natural end, but never inside a keep-together block.
    let pageEnd = naturalEnd;
    if (splitsBlock(naturalEnd, pageStart)) {
      // Move the cut to the start of the block that would be split,
      // so the whole block moves to the next page.
      const block = avoidBlocks.find(
        (b) => b.top > pageStart && b.top < naturalEnd && b.bottom > naturalEnd,
      )!;
      pageEnd = block.top;
    }

    // Avoid a very short page (less than 25% filled) unless keeping a block together.
    const minFill = pageStart + canvasPageHeight * 0.25;
    if (pageEnd < minFill) {
      // Only fall back to naturalEnd if it doesn't split a block.
      if (!splitsBlock(naturalEnd, pageStart)) {
        pageEnd = naturalEnd;
      }
    }

    if (pageEnd <= pageStart) break;
    cuts.push(pageEnd);
    pageStart = pageEnd;
  }


  const { getIsPremium } = await import("@/lib/premium-flag");
  const watermark = getIsPremium() ? null : "FREE COPY - Smart Lesson Craft";

  cuts.forEach((start, index) => {
    const end = cuts[index + 1] ?? canvas.height;
    const sliceHeight = Math.max(1, Math.round(end - start));
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeight;
    const ctx = slice.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, Math.round(start), canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    const imageHeight = (sliceHeight * usableWidth) / canvas.width;
    if (index > 0) pdf.addPage();
    pdf.addImage(
      slice.toDataURL("image/jpeg", 0.95),
      "JPEG",
      margin,
      margin,
      usableWidth,
      Math.min(imageHeight, usableHeight),
    );
  });

  if (watermark) {
    const doc = pdf as unknown as {
      GState?: new (opts: { opacity: number }) => unknown;
      setGState: (state: unknown) => void;
    };
    const pageCount = pdf.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
      pdf.setPage(page);
      if (doc.GState) doc.setGState(new doc.GState({ opacity: 0.12 }));
      pdf.setTextColor(120, 120, 120);
      pdf.setFontSize(26);
      for (let row = 0; row < 5; row++) {
        pdf.text(watermark, pageWidth / 2, 40 + row * 55, { align: "center", angle: 30 });
      }
      if (doc.GState) doc.setGState(new doc.GState({ opacity: 1 }));
    }
  }


  pdf.save(fileName);
}
