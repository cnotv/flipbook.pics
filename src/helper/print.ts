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
  const isLandscape = ratio > width / height;
  const pdfWidth = isLandscape ? width : height * ratio;
  const pdfHeight = isLandscape ? height : width / ratio;

  // Create content array starting with cover if available
  const content = [];
  const colorBorder = "#CCCCCC";
  const bindingWidth = 80;
  const pageMargins = [5, 5, 5, 5] as [number, number, number, number];
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
  const binding = {
    canvas: [
      {
        type: "rect",
        x: 0,
        y: 0,
        w: bindingWidth,
        h: pdfHeight,
        color: "#FFFFFF",
      },
    ],
    width: bindingWidth,
    height: pdfHeight,
    border: [true, true, false, true], // left, top, right, bottom
  };

  // Add cover as first page if it exists
  if (cover) {
    content.push({
      table: {
        widths: [bindingWidth, pdfWidth], // 20px for rectangle, rest for image
        body: [
          [
            binding,
            {
              // Image
              image: cover,
              ...imageProperties,
              border: [false, true, true, true], // left, top, right, bottom
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
        widths: [bindingWidth, pdfWidth], // 20px for rectangle, rest for image
        body: [
          [
            binding,
            {
              // Image
              image,
              width: pdfWidth,
              height: pdfHeight,
              alignment: "center" as const,
              border: [false, true, true, true], // left, top, right, bottom
            },
          ],
        ],
      },
      layout: borderLayout,
      alignment: "center" as const,
    });
  });

  const document = {
    pageMargins,
    content,
  };
  pdfMake.createPdf(document).download();
};
