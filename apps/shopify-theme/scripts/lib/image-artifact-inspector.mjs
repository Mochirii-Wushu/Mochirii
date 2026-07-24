import sharp from "sharp";

const MIN_EVIDENCE_DIMENSION = 600;
const SAMPLE_DIMENSION = 256;
const MIN_ENTROPY_BITS = 0.1;
const MIN_STANDARD_DEVIATION = 1;
const MIN_DYNAMIC_RANGE = 8;

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = Buffer.concat(chunks);

function decodedStatistics(data) {
  const histogram = new Uint32Array(256);
  let sum = 0;
  let sumOfSquares = 0;
  let minimum = 255;
  let maximum = 0;
  for (const value of data) {
    histogram[value] += 1;
    sum += value;
    sumOfSquares += value * value;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  const count = data.length;
  const mean = sum / count;
  const variance = Math.max(0, (sumOfSquares / count) - (mean * mean));
  let entropyBits = 0;
  for (const frequency of histogram) {
    if (frequency === 0) continue;
    const probability = frequency / count;
    entropyBits -= probability * Math.log2(probability);
  }
  return {
    dynamicRange: maximum - minimum,
    entropyBits,
    standardDeviation: Math.sqrt(variance),
  };
}

try {
  if (input.length === 0) throw new Error("empty-image");
  const image = sharp(input, {
    animated: true,
    failOn: "error",
    limitInputPixels: 100_000_000,
    sequentialRead: true,
  });
  const metadata = await image.metadata();
  const width = metadata.width;
  const pageHeight = metadata.pageHeight ?? metadata.height;
  const pages = metadata.pages ?? 1;
  if (!Number.isSafeInteger(width) || width <= 0 ||
      !Number.isSafeInteger(pageHeight) || pageHeight <= 0 ||
      !Number.isSafeInteger(pages) || pages !== 1 ||
      width * pageHeight * pages > 100_000_000) {
    throw new Error("invalid-dimensions");
  }
  if (width < MIN_EVIDENCE_DIMENSION || pageHeight < MIN_EVIDENCE_DIMENSION) {
    throw new Error("insufficient-dimensions");
  }
  const decoded = await sharp(input, {
    page: 0,
    pages: 1,
    failOn: "error",
    limitInputPixels: 100_000_000,
    sequentialRead: true,
  })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .greyscale()
    .resize(SAMPLE_DIMENSION, SAMPLE_DIMENSION, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (!decoded?.data?.length || !Number.isSafeInteger(decoded.info?.width) || decoded.info.width <= 0 ||
      !Number.isSafeInteger(decoded.info?.height) || decoded.info.height <= 0 || decoded.info.channels !== 1) {
    throw new Error("decode-failed");
  }
  const statistics = decodedStatistics(decoded.data);
  if (!Number.isFinite(statistics.entropyBits) || statistics.entropyBits < MIN_ENTROPY_BITS ||
      !Number.isFinite(statistics.standardDeviation) || statistics.standardDeviation < MIN_STANDARD_DEVIATION ||
      statistics.dynamicRange < MIN_DYNAMIC_RANGE) {
    throw new Error("blank-or-trivial-image");
  }
  process.stdout.write(JSON.stringify({
    format: metadata.format,
    width,
    height: pageHeight,
    pages,
    entropy_bits: statistics.entropyBits,
    standard_deviation: statistics.standardDeviation,
    dynamic_range: statistics.dynamicRange,
  }));
} catch {
  process.exitCode = 1;
}
