import type { Evidence, Signal, SignalId, SignalParamsById } from "@idealo-hw/sensors";
import { describe, expect, it } from "vitest";
import { describeSignal, evidenceTitle } from "../../../../../src/features/ratings/view-model";

const signal = <K extends SignalId>(
  id: K,
  params: SignalParamsById[K],
  evidence: Evidence[] = [],
): Signal => ({
  sensorId: id.split(".")[0] ?? "",
  id,
  kind: "flag",
  severity: "amber",
  params,
  evidence,
});

const qty = (amount: number, unit: "GB" | "px" | "nits" | "Wh" | "W" | "MP") =>
  ({ kind: "quantity", amount, unit }) as const;

describe("describeSignal", () => {
  it.each([
    [
      signal("power.very_low", { tdpWatts: 9, cpuMarkPerWatt: 1020 }),
      "Very low power",
      "9 W TDP · 1.020 CPU Mark per W",
    ],
    [
      signal("power.very_high", { tdpWatts: 55, cpuMarkPerWatt: 45000 / 55 }),
      "Very high power",
      "55 W TDP · 818 CPU Mark per W",
    ],
    [signal("power.very_low", { tdpWatts: 9, cpuMarkPerWatt: null }), "Very low power", "9 W TDP"],
    [
      signal("red_flags.display_low_res", { heightPx: 768, minHeightPx: 1080 }),
      "Low-res screen",
      "Panel is 768 px tall; Full HD (1.080 px) is the usual minimum.",
    ],
    [
      signal("red_flags.ram_tiny", { ramGb: 4 }),
      "Very little RAM",
      "4 GB is too little for current Windows and browsers.",
    ],
    [
      signal("red_flags.ram_low", { ramGb: 8 }),
      "Low RAM",
      "8 GB covers basic use but leaves no room to grow.",
    ],
    [
      signal("red_flags.storage_emmc", null),
      "eMMC storage",
      "Soldered eMMC flash is slower than an SSD and cannot be swapped.",
    ],
    [
      signal("red_flags.storage_hdd_only", null),
      "Hard drive only",
      "A spinning hard drive and no SSD: slow to boot and to open anything.",
    ],
    [
      signal("red_flags.storage_tiny", { storageGb: 128 }),
      "Very little storage",
      "128 GB fills up quickly with the system and updates.",
    ],
    [
      signal("red_flags.storage_small", { storageGb: 256 }),
      "Small storage",
      "256 GB is workable but tight.",
    ],
    [
      signal("red_flags.ram_type_outdated", { label: "LPDDR4X", currentGeneration: 5 }),
      "Outdated RAM type",
      "LPDDR4X is older than DDR5.",
    ],
    [
      signal("red_flags.wifi_old", { generation: 5, currentGeneration: 6 }),
      "Old Wi-Fi",
      "Wi-Fi 5 is behind Wi-Fi 6 in speed and range.",
    ],
    [
      signal("red_flags.display_dim", { nits: 250 }),
      "Dim screen",
      "250 nits is hard to read in a bright room.",
    ],
    [
      signal("red_flags.battery_small", { wh: 44.5 }),
      "Small battery",
      "44,5 Wh gives a short runtime.",
    ],
    [
      signal("red_flags.model_old", { releaseYear: 2021, yearsAgo: 5 }),
      "Old model",
      "Released in 2021, 5 years ago.",
    ],
    [
      signal("red_flags.usb2_only", null),
      "USB 2 only",
      "No faster ports: slow for external drives and docks.",
    ],
    [
      signal("red_flags.video_out_old", null),
      "Old video output",
      "HDMI 1.4 caps a 4K display at 30 Hz.",
    ],
    [
      signal("red_flags.no_os", null),
      "No operating system",
      "Ships without Windows; budget for a license or install your own.",
    ],
    [signal("webcam.full_hd", null), "1080p+ webcam", "Sharp video calls."],
    [signal("webcam.ir", null), "IR camera", "Face login with Windows Hello."],
    [signal("webcam.low_res", null), "720p webcam", "Video calls look soft."],
    [signal("webcam.none", null), "No webcam", "The datasheet lists no camera."],
  ])("words %#", (input, label, detail) => {
    expect(describeSignal(input)).toEqual({ label, detail });
  });

  it("marks a figure the product does not state", () => {
    expect(describeSignal(signal("red_flags.ram_low", { ramGb: undefined })).detail).toBe(
      "? GB covers basic use but leaves no room to grow.",
    );
    expect(
      describeSignal(signal("red_flags.model_old", { releaseYear: undefined, yearsAgo: 0 })).detail,
    ).toBe("Released in an unknown year, 0 years ago.");
    expect(
      describeSignal(
        signal("red_flags.ram_type_outdated", { label: undefined, currentGeneration: 5 }),
      ).detail,
    ).toBe("This memory is older than DDR5.");
  });
});

describe("evidenceTitle", () => {
  const title = (...evidence: Evidence[]) => evidenceTitle({ evidence });

  it("joins the facts as field: value lines", () => {
    expect(
      title(
        { field: "storageKind", value: { kind: "storage", storage: "emmc" } },
        { field: "storageGb", value: qty(64, "GB") },
      ),
    ).toBe("storageKind: eMMC · storageGb: 64 GB");
    expect(title()).toBe("");
  });

  it.each([
    [{ field: "displayHeightPx", value: qty(768, "px") }, "displayHeightPx: 768 px"],
    [{ field: "brightnessNits", value: qty(250.5, "nits") }, "brightnessNits: 250.5 nits"],
    [{ field: "batteryWh", value: qty(44, "Wh") }, "batteryWh: 44 Wh"],
    [{ field: "webcam.megapixels", value: qty(2, "MP") }, "webcam.megapixels: 2 MP"],
    [{ field: "tdp", value: qty(65, "W") }, "TDP: 65 W"],
    [{ field: "tdp", value: qty(28.5, "W") }, "TDP: 29 W"],
    [
      { field: "tdpSource", value: { kind: "tdp_source", source: "benchmark" } },
      "TDP source: benchmark",
    ],
    [
      { field: "wifiGeneration", value: { kind: "generation", family: "wifi", generation: 5 } },
      "wifiGeneration: Wi-Fi 5",
    ],
    [
      { field: "usbMaxGen", value: { kind: "generation", family: "usb", generation: 2 } },
      "usbMaxGen: USB 2",
    ],
    [{ field: "releaseYear", value: { kind: "year", year: 2021 } }, "releaseYear: 2021"],
    [{ field: "ramType", value: { kind: "ram_type", label: "DDR4" } }, "ramType: DDR4"],
    [{ field: "osKind", value: { kind: "os", os: "chromeos" } }, "osKind: Chrome OS"],
    [{ field: "osKind", value: { kind: "os", os: "none" } }, "osKind: None"],
    [
      { field: "storageKind", value: { kind: "storage", storage: "hybrid" } },
      "storageKind: Hybrid (SSHD)",
    ],
    [{ field: "webcam.present", value: { kind: "answer", yes: false } }, "webcam.present: no"],
    [{ field: "webcam.irCamera", value: { kind: "answer", yes: true } }, "webcam.irCamera: yes"],
    [
      {
        field: "videoOutputs",
        value: {
          kind: "video_outputs",
          outputs: [
            { kind: "hdmi", version: 1.4 },
            { kind: "hdmi", version: null },
            { kind: "usb_c" },
            { kind: "displayport" },
            { kind: "thunderbolt" },
            { kind: "vga" },
            { kind: "dvi" },
          ],
        },
      },
      "videoOutputs: HDMI 1.4, HDMI, USB-C, DisplayPort, Thunderbolt, VGA, DVI",
    ],
  ] satisfies [Evidence, string][])("reads %j", (evidence, expected) => {
    expect(title(evidence)).toBe(expected);
  });
});
