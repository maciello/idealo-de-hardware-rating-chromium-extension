export interface WebcamThresholds {
  /** Inclusive: a camera at least this tall (short side of the pixel grid) is Full HD or better. */
  fullHdMinHeightPx: number;
  /** Inclusive: a camera of at least this many megapixels is Full HD or better. */
  fullHdMinMegapixels: number;
  /** Inclusive: a camera at most this tall is 720p or worse. */
  lowMaxHeightPx: number;
}

export const WEBCAM_THRESHOLDS: WebcamThresholds = {
  fullHdMinHeightPx: 1080,
  fullHdMinMegapixels: 2,
  lowMaxHeightPx: 720,
};
