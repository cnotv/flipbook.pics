import * as pdfMake from "pdfmake/build/pdfmake";

interface PrintOptions {
  frames: string[];
  cover?: string | null;
  width: number;
  height: number;
  videoAspectRatio: number;
}

/**
 * Generate and download PDF preview of the flipbook
 */
export const generateFlipbookPDF = (options: PrintOptions): void => {
  const { frames, cover, width, height, videoAspectRatio } = options;

  // Calculate dimensions maintaining aspect ratio
  let pdfWidth, pdfHeight;
  if (videoAspectRatio > width / height) {
    // Video is wider, constrain by width
    pdfWidth = width;
    pdfHeight = width / videoAspectRatio;
  } else {
    // Video is taller, constrain by height
    pdfHeight = height;
    pdfWidth = height * videoAspectRatio;
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
