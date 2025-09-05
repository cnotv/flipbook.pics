import { it } from "vitest";
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
  const colorBorder = "#CCCCCC";
  const borderLayout = {
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    hLineColor: () => colorBorder,
    vLineColor: () => colorBorder,
    hLineStyle: () => ({ dash: { length: 3, space: 2 } }),
    vLineStyle: () => ({ dash: { length: 3, space: 2 } }),
    paddingLeft: () => 2,
    paddingRight: () => 2,
    paddingTop: () => 2,
    paddingBottom: () => 2,
  };
  const imageProperties = {
    width: pdfWidth,
    height: pdfHeight,
    alignment: "center" as const,
    border: [true, true, true, true],
  };

  // Add cover as first page if it exists
  if (cover) {
    content.push({
      table: {
        body: [
          [
            {
              image: cover,
              ...imageProperties,
            },
          ],
        ],
      },
      layout: borderLayout,
      alignment: "center" as const,
    });
  }

  // Add all video frames
  frames.forEach((image) => {
    content.push({
      table: {
        body: [
          [
            {
              image,
              width: pdfWidth,
              height: pdfHeight,
              alignment: "center" as const,
              border: [true, true, true, true],
            },
          ],
        ],
      },
      layout: borderLayout,
      alignment: "center" as const,
    });
  });

  const document = {
    pageMargins: [5, 5, 5, 5] as [number, number, number, number],
    content,
  };
  pdfMake.createPdf(document).download();
};
