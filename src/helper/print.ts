import * as pdfMake from "pdfmake/build/pdfmake";

interface PrintOptions {
  frames: string[];
  cover?: string | null;
  size: {
    width: number;
    height: number;
  };
  ratio: number;
}

/**
 * Generate and download PDF preview of the flipbook
 */
export const generateFlipbookPDF = (options: PrintOptions): void => {
  const {
    frames,
    cover,
    size: { height, width },
    ratio,
  } = options;

  // Calculate dimensions maintaining aspect ratio
  let pdfWidth, pdfHeight;
  if (ratio > width / height) {
    // Video is wider, constrain by width
    pdfWidth = width;
    pdfHeight = width / ratio;
  } else {
    // Video is taller, constrain by height
    pdfHeight = height;
    pdfWidth = height * ratio;
  }

  // Create content array starting with cover if available
  const content = [];

  // Add cover as first page if it exists
  if (cover) {
    content.push({
      image: cover,
      width: pdfWidth,
      height: pdfHeight,
      alignment: "center" as const,
    });
  }

  // Add all video frames
  frames.forEach((image) => {
    content.push({
      image,
      width: pdfWidth,
      height: pdfHeight,
      alignment: "center" as const,
    });
  });

  const document = {
    pageMargins: [5, 5, 5, 5] as [number, number, number, number],
    content,
  };
  pdfMake.createPdf(document).download();
};
