import type { IgpuRule } from "../../model";

/** Rules for: qualcomm, nvidia, apple-mediatek. */
export const OTHER_QUALCOMM_TO_APPLE_MEDIATEK_RULES: readonly IgpuRule[] = [
  {
    id: "qualcomm-snapdragon-x-elite-and-plus-10core-adreno-x1-85",
    match: {
      vendor: "Qualcomm",
      family: "Snapdragon",
      modelIn: ["X1E-78-100", "X1E-80-100", "X1E-84-100", "X1P-64-100"],
    },
    igpu: { kind: "passmark", name: "Qualcomm Adreno X1-85 GPU" },
    caveat:
      "x1p-64-100_label_x1-85_from_notebookcheck_qualcomm_calls_it_Adreno_GPU_3.8_TFLOPS=true",
    evidence: [
      "https://www.notebookcheck.net/Qualcomm-Snapdragon-X-Plus-X1P-64-100-Processor-Benchmarks-and-Specs.838786.0.html",
      "https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X2-Elite-Product-Brief.pdf",
    ],
    confidence: 0.85,
  },
  {
    id: "qualcomm-snapdragon-x-plus-8core-adreno-x1-45",
    match: { vendor: "Qualcomm", family: "Snapdragon", modelIn: ["X1P-42-100"] },
    igpu: { kind: "passmark", name: "Qualcomm Adreno X1-45 GPU" },
    caveat: "",
    evidence: [
      "https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X-Plus-8-Core-Product-Brief.pdf",
      "https://www.notebookcheck.net/Qualcomm-Snapdragon-X-Plus-X1P-42-100-Processor-Benchmarks-and-Specs.838787.0.html",
    ],
    confidence: 0.9,
  },
  {
    id: "qualcomm-snapdragon-x2-elite-adreno-x2-90",
    match: {
      labelKeyIn: [
        "qualcomm-snapdragon-x2-elite-x2e-90-100",
        "qualcomm-snapdragon-x2-elite-x2e-88-100",
        "qualcomm-snapdragon-x2-elite-x2e-94-100",
        "qualcomm-snapdragon-x2-elite-extreme-x2e-96-100",
      ],
    },
    igpu: { kind: "passmark", name: "Qualcomm Adreno X2-90 GPU" },
    caveat: "",
    evidence: [
      "https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X2-Elite-Product-Brief.pdf",
      "https://www.notebookcheck.net/Qualcomm-Adreno-X2-90-Benchmarks-and-Specs.1130809.0.html",
    ],
    confidence: 0.9,
  },
  {
    id: "qualcomm-snapdragon-x2-elite-adreno-x2-85",
    match: {
      labelKeyIn: [
        "qualcomm-snapdragon-x2-elite-x2e-84-100",
        "qualcomm-snapdragon-x2-elite-x2e-80-100",
        "qualcomm-snapdragon-x2-elite-x2e-78-100",
      ],
    },
    igpu: { kind: "passmark", name: "Qualcomm Adreno X2-85 GPU" },
    caveat: "",
    evidence: [
      "https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X2-Elite-Product-Brief.pdf",
    ],
    confidence: 0.85,
  },
  {
    id: "qualcomm-snapdragon-x2-plus-adreno-x2-45",
    match: { labelKeyIn: ["qualcomm-snapdragon-x2-plus-x2p-64-100"] },
    igpu: { kind: "passmark", name: "Qualcomm Adreno X2-45 GPU" },
    caveat: "gpu_name_not_confirmed_in_session=true",
    evidence: [
      "https://www.notebookcheck.net/Qualcomm-Snapdragon-X2-Plus-X2P-64-100-Processor-Benchmarks-and-Specs.1196969.0.html",
    ],
    confidence: 0.55,
  },
  {
    id: "qualcomm-snapdragon-7c-adreno-618",
    match: { labelKeyIn: ["qualcomm-snapdragon-7c"] },
    igpu: { kind: "passmark", name: "Qualcomm Adreno 618 GPU" },
    caveat: "",
    evidence: [
      "https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/prod_brief_qcom_sd7c.pdf",
      "https://laptopmedia.com/video-card/qualcomm-adreno-618/",
    ],
    confidence: 0.9,
  },
  {
    id: "nvidia-rtx-spark-n1x",
    match: { labelKeyIn: ["nvidia-rtx-spark-n1x-650", "nvidia-rtx-spark-n1x-675"] },
    igpu: { kind: "passmark", name: "RTX Spark N1X" },
    caveat: "low_samples=true; variant_650_vs_675_core_count_unverified=true",
    evidence: [
      "https://hothardware.com/news/nvidia-announces-rtx-spark-at-computex-2026",
      "https://windowscentral.com/hardware/nvidia/nvidia-confirms-rtx-spark-configurations-and-availability-first-devices-expected-to-begin-shipping-as-soon-as-next-month-with-two-n1x-configs-on-offer",
    ],
    confidence: 0.55,
  },
  {
    id: "apple-m-series-no-row",
    match: { vendor: "Apple" },
    igpu: { kind: "unrated", name: "Apple M-series GPU" },
    caveat: "passmark_gpu_csv_has_no_apple_rows=true",
    evidence: [],
    confidence: 0.9,
  },
  {
    id: "apple-a18-pro-no-row",
    match: { labelKeyIn: ["apple-a18-pro"] },
    igpu: { kind: "unrated", name: "Apple A18 Pro GPU" },
    caveat: "passmark_gpu_csv_has_no_apple_rows=true",
    evidence: [],
    confidence: 0.9,
  },
  {
    id: "mediatek-kompanio-520-540-mali",
    match: { vendor: "MediaTek", family: "Kompanio", numberIn: [520, 540] },
    igpu: { kind: "unrated", name: "Mali-G52 MC2" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/MediaTek-Kompanio-520-Processor-Benchmarks-and-Specs.785566.0.html",
    ],
    confidence: 0.7,
  },
  {
    id: "mediatek-kompanio-838-mali",
    match: { vendor: "MediaTek", family: "Kompanio", numberIn: [838] },
    igpu: { kind: "unrated", name: "Mali-G57 MP3" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/MediaTek-Kompanio-838-Processor-Benchmarks-and-Specs.936966.0.html",
    ],
    confidence: 0.8,
  },
];
