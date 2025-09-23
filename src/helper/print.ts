import * as pdfMake from "pdfmake/build/pdfmake";

interface PrintOptions {
  frames: string[];
  cover?: string | null;
  size: {
    width: number;
    height: number;
  };
  ratio: number;
  orientation?: "landscape" | "portrait";
}

/**
 * Rotate an image 90 degrees clockwise for portrait orientation printing
 */
const rotateImageForPrint = (
  imageDataUrl: string,
  orientation: "landscape" | "portrait" = "landscape",
): Promise<string> => {
  return new Promise((resolve) => {
    if (orientation === "landscape") {
      // No rotation needed for landscape
      resolve(imageDataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(imageDataUrl);
        return;
      }

      // For portrait printing, we rotate the image 90° clockwise
      // so it prints correctly on landscape paper
      canvas.width = img.height;
      canvas.height = img.width;

      // Move to center and rotate
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2); // 90° clockwise
      ctx.translate(-img.width / 2, -img.height / 2);

      // Draw the rotated image
      ctx.drawImage(img, 0, 0);

      // Return the rotated image as data URL
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };

    img.src = imageDataUrl;
  });
};

/**
 * Generate and download PDF preview of the flipbook
 */
export const generateFlipbookPDF = async (
  options: PrintOptions,
): Promise<void> => {
  const {
    frames,
    cover,
    size: { height, width },
    orientation = "landscape",
  } = options;

  // For portrait orientation, swap dimensions and rotate images
  // so the print layout stays consistent (landscape paper layout)
  const pdfWidth = orientation === "portrait" ? height : width;
  const pdfHeight = orientation === "portrait" ? width : height;

  // Rotate images if needed for portrait orientation
  const processedFrames = await Promise.all(
    frames.map((frame) => rotateImageForPrint(frame, orientation)),
  );

  const processedCover = cover
    ? await rotateImageForPrint(cover, orientation)
    : null;

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
  if (processedCover) {
    content.push({
      table: {
        widths: [bindingWidth, pdfWidth], // 20px for rectangle, rest for image
        body: [
          [
            binding,
            {
              // Image
              image: processedCover,
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
  processedFrames.forEach((image) => {
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
