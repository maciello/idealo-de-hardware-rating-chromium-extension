/** Labels and details of the webcam signals. */
export const WEBCAM_COPY = {
  fullHd: { label: "1080p+ webcam", detail: "Sharp video calls." },
  ir: { label: "IR camera", detail: "Face login with Windows Hello." },
  low: { label: "720p webcam", detail: "Video calls look soft." },
  none: { label: "No webcam", detail: "The datasheet lists no camera." },
} as const;
