import type { ParticipantV1 } from "./raffle";
import { wheelSegmentLabel } from "@/lib/spinner/media-contract";

const WHEEL_PALETTE = [
  "#123f3a",
  "#6c354e",
  "#185f52",
  "#393555",
  "#824f35",
  "#254b67",
] as const;

export function drawWheel(canvas: HTMLCanvasElement, participants: readonly ParticipantV1[]) {
  const bounds = canvas.getBoundingClientRect();
  const size = Math.max(1, Math.min(bounds.width || 640, bounds.height || bounds.width || 640));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelSize = Math.round(size * dpr);
  if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
    canvas.width = pixelSize;
    canvas.height = pixelSize;
  }

  const context = canvas.getContext("2d");
  if (!context) return;
  const canvasFontFamily = getComputedStyle(canvas).fontFamily || "serif";
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, size, size);

  const center = size / 2;
  const radius = size * 0.475;
  const count = Math.max(1, participants.length);
  const slice = (Math.PI * 2) / count;
  const startAt = -Math.PI / 2 - slice / 2;

  context.save();
  context.shadowColor = "rgba(200, 162, 75, 0.58)";
  context.shadowBlur = size * 0.035;
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.fillStyle = "#071311";
  context.fill();
  context.restore();

  if (participants.length === 0) {
    const emptyGradient = context.createRadialGradient(center, center, 0, center, center, radius);
    emptyGradient.addColorStop(0, "#17493f");
    emptyGradient.addColorStop(0.55, "#102b2a");
    emptyGradient.addColorStop(1, "#080b14");
    context.fillStyle = emptyGradient;
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(248, 220, 143, 0.86)";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `600 ${Math.max(14, size * 0.035)}px ${canvasFontFamily}`;
    context.fillText("AWAITING THE NEXT ROSTER", center, center + size * 0.2);
  } else {
    participants.forEach((participant, index) => {
      const start = startAt + index * slice;
      const end = start + slice;
      const color = WHEEL_PALETTE[index % WHEEL_PALETTE.length];
      const segmentGradient = context.createRadialGradient(center, center, radius * 0.15, center, center, radius);
      segmentGradient.addColorStop(0, `${color}e8`);
      segmentGradient.addColorStop(1, color);

      context.beginPath();
      context.moveTo(center, center);
      context.arc(center, center, radius, start, end);
      context.closePath();
      context.fillStyle = segmentGradient;
      context.fill();
      context.strokeStyle = "rgba(248, 220, 143, 0.34)";
      context.lineWidth = Math.max(0.6, size * 0.0018);
      context.stroke();

      const middle = start + slice / 2;
      const fontSize = Math.max(8, Math.min(size * 0.034, (size * 0.68 * slice) / 2.8));
      const label = wheelSegmentLabel(participant.displayName, participants.length, index);
      context.save();
      context.translate(center, center);
      context.rotate(middle);
      context.textAlign = "right";
      context.textBaseline = "middle";
      context.font = `600 ${fontSize}px ${canvasFontFamily}`;
      context.fillStyle = "#fff8df";
      context.shadowColor = "rgba(0, 0, 0, 0.88)";
      context.shadowBlur = 3;
      context.fillText(label, radius * 0.89, 0, radius * 0.68);
      context.restore();
    });
  }

  context.save();
  context.strokeStyle = "#c8a24b";
  context.lineWidth = Math.max(3, size * 0.012);
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(89, 201, 165, 0.82)";
  context.lineWidth = Math.max(1, size * 0.004);
  context.beginPath();
  context.arc(center, center, radius - size * 0.016, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}
