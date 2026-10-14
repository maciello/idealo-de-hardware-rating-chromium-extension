import { describe, expect, it } from "vitest";
import { fromCharacteristics, fromDatasheet, mergeFacts, type ProductFacts } from "../../src/facts";
import { datasheet } from "../fixtures/datasheets";

const one = (label: string, value: string): ProductFacts =>
  fromDatasheet(new Map([[label, value]]));

describe("fromDatasheet", () => {
  it("reads a whole modern datasheet into canonical facts", () => {
    expect(fromDatasheet(datasheet())).toEqual({
      displayHeightPx: 1600,
      ramGb: 16,
      storageGb: 512,
      storageKind: "ssd",
      wifiGeneration: 7,
      brightnessNits: 400,
      batteryWh: 70,
      releaseYear: 2025,
      usbMaxGen: 4,
      videoOutputs: [{ kind: "hdmi", version: 2.1 }],
      osKind: "windows",
      webcam: { present: true, heightPx: 1080 },
    });
  });

  it("states nothing for an empty datasheet", () => {
    expect(fromDatasheet(new Map())).toEqual({});
  });

  it("matches labels case- and whitespace-insensitively", () => {
    expect(one("  ram ", "8 GB")).toEqual({ ramGb: 8 });
    expect(one("wlan-standard", "IEEE 802.11ax")).toEqual({ wifiGeneration: 6 });
  });

  describe("numbers", () => {
    it.each([
      ["RAM", "16 GB", { ramGb: 16 }],
      ["SSD-Speicher", "1.000 GB", { storageGb: 1000, storageKind: "ssd" }],
      ["SSD-Speicher", "2 TB", { storageGb: 2000, storageKind: "ssd" }],
      ["Festplattenspeicher", "500 GB", { storageGb: 500 }],
      ["Interner Speicher", "64 GB", { storageGb: 64 }],
      ["Helligkeit", "300 cd/m²", { brightnessNits: 300 }],
      ["Markteinführung", "2025", { releaseYear: 2025 }],
      ["Wattstunden", "60 Wh", { batteryWh: 60 }],
      ["Wattstunden", "52,5 Wh", { batteryWh: 52.5 }],
    ] as const)("%s %j", (label, value, expected) => {
      expect(one(label, value)).toEqual(expected);
    });

    it("keeps the largest capacity when several rows state one", () => {
      const facts = fromDatasheet(
        new Map([
          ["SSD-Speicher", "256 GB"],
          ["Festplattenspeicher", "1.000 GB"],
        ]),
      );
      expect(facts.storageGb).toBe(1000);
      expect(facts.storageKind).toBe("ssd");
    });
  });

  describe("display", () => {
    it.each([
      ["1.920 x 1.080 Pixel", 1080],
      ["1.366 x 768 Pixel", 768],
      ["3.840 x 2.160 Pixel", 2160],
      ["1080 x 1920 Pixel", 1080],
    ])("Displayauflösung %j is %i px tall", (value, height) => {
      expect(one("Displayauflösung", value)).toEqual({ displayHeightPx: height });
    });

    it.each([
      ["HD Ready", 768],
      ["Full HD", 1080],
      ["WUXGA", 1200],
      ["2,8K", 1800],
      ["Retina", 1600],
    ])("Display-Technologie %j", (value, height) => {
      expect(one("Display-Technologie", value)).toEqual({ displayHeightPx: height });
    });

    it("prefers the pixel grid over the technology name", () => {
      const facts = fromDatasheet(
        new Map([
          ["Display-Technologie", "Full HD"],
          ["Displayauflösung", "1.920 x 1.200 Pixel"],
        ]),
      );
      expect(facts.displayHeightPx).toBe(1200);
    });

    it("gives no fact for an unknown technology name", () => {
      expect(one("Display-Technologie", "Quantum Dot Supreme")).toEqual({});
    });
  });

  describe("storage kind", () => {
    it.each([
      ["SSD-Festplatte", "ssd"],
      ["PCIe-SSD-Festplatte", "ssd"],
      ["M.2 SSD", "ssd"],
      ["Flash-Speicher", "emmc"],
      ["eMMC", "emmc"],
      ["HDD-Festplatte", "hdd"],
      ["SSHD", "hybrid"],
      ["Hybrid-Festplatte", "hybrid"],
      ["SSD + HDD", "ssd"],
    ] as const)("Festplattentyp %j is %s", (value, kind) => {
      expect(one("Festplattentyp", value)).toEqual({ storageKind: kind });
    });

    it("says nothing for a bare Festplatte", () => {
      expect(one("Festplattentyp", "Festplatte")).toEqual({});
    });

    it("lets a stated SSD capacity overrule an HDD type", () => {
      const facts = fromDatasheet(
        new Map([
          ["Festplattentyp", "HDD-Festplatte"],
          ["SSD-Speicher", "256 GB"],
        ]),
      );
      expect(facts.storageKind).toBe("ssd");
    });
  });

  describe("Wi-Fi", () => {
    it.each([
      ["IEEE 802.11ax", 6],
      ["IEEE 802.11be", 7],
      ["IEEE 802.11ac", 5],
      ["IEEE 802.11n", 4],
      ["Wi-Fi 6E", 6],
      ["Wi-Fi 7", 7],
      ["IEEE 802.11a, IEEE 802.11b, IEEE 802.11g, IEEE 802.11n", 4],
      ["IEEE 802.11a, IEEE 802.11b, IEEE 802.11g, IEEE 802.11n, IEEE 802.11ac, IEEE 802.11ax", 6],
      ["802.11 a/b/g/n/ac", 5],
    ])("WLAN-Standards %j is generation %i", (value, generation) => {
      expect(one("WLAN-Standards", value)).toEqual({ wifiGeneration: generation });
    });

    it("takes the newest generation across both labels", () => {
      const facts = fromDatasheet(
        new Map([
          ["WLAN-Standard", "IEEE 802.11ac"],
          ["WLAN-Standards", "IEEE 802.11n, IEEE 802.11ax"],
        ]),
      );
      expect(facts.wifiGeneration).toBe(6);
    });
  });

  describe("USB", () => {
    it.each([
      ["2 x USB 3.2, 2 x USB 3.1, Kopfhörerausgang, Mikrofoneingang", 3],
      ["6 x USB 2.0, 1 x LAN (RJ45), Kopfhörerausgang", 2],
      ["1 x Thunderbolt 4", 4],
      ["2 x USB 2.0, 1 x USB Typ-C", 3],
      ["1 x USB-C, 1 x USB 2.0", 3],
      ["1 x USB 4", 4],
      ["2 x USB 2.0, 1 x USB 3.0 Typ-C", 3],
    ])("Anschlüsse %j is USB %i", (value, generation) => {
      expect(one("Anschlüsse", value)).toEqual({ usbMaxGen: generation });
    });

    it("reads the front ports too and keeps the newest", () => {
      const facts = fromDatasheet(
        new Map([
          ["Anschlüsse", "6 x USB 2.0, 1 x LAN (RJ45)"],
          ["Frontanschlüsse", "2 x USB 3.2 Gen1, 2 x USB 2.0, 1 x Mikrofon"],
        ]),
      );
      expect(facts.usbMaxGen).toBe(3);
    });

    it.each(["Kopfhörerausgang, Mikrofoneingang", "4 x USB", ""])(
      "states no generation for %j",
      (value) => {
        expect(one("Anschlüsse", value)).toEqual({});
      },
    );
  });

  describe("video outputs", () => {
    it.each([
      ["HDMI 2.1", [{ kind: "hdmi", version: 2.1 }]],
      ["HDMI 1.4", [{ kind: "hdmi", version: 1.4 }]],
      ["HDMI", [{ kind: "hdmi", version: null }]],
      ["Thunderbolt 4", [{ kind: "thunderbolt" }]],
      ["DisplayPort", [{ kind: "displayport" }]],
      [
        "VGA, DisplayPort, HDMI",
        [{ kind: "vga" }, { kind: "displayport" }, { kind: "hdmi", version: null }],
      ],
      [
        "DisplayPort, HDMI, USB Typ-C",
        [{ kind: "displayport" }, { kind: "hdmi", version: null }, { kind: "usb_c" }],
      ],
    ])("Videoausgänge %j", (value, outputs) => {
      expect(one("Videoausgänge", value)).toEqual({ videoOutputs: outputs });
    });

    it("states nothing for an unreadable list", () => {
      expect(one("Videoausgang", "ja")).toEqual({});
    });
  });

  describe("operating system and webcam", () => {
    it.each([
      ["Windows 11 Home", "windows"],
      ["Microsoft Windows 11 Professional", "windows"],
      ["Chrome OS", "chromeos"],
      ["macOS Sonoma", "macos"],
      ["Ubuntu 24.04", "linux"],
      ["Free DOS", "none"],
      ["FreeDOS", "none"],
      ["ohne Betriebssystem", "none"],
    ] as const)("Betriebssystem %j is %s", (value, kind) => {
      expect(one("Betriebssystem", value)).toEqual({ osKind: kind });
    });

    it("gives no OS for a name it does not know", () => {
      expect(one("Betriebssystem", "HarmonyOS")).toEqual({});
    });

    it.each([
      ["1920 x 1080 Pixel", 1080],
      ["1280 x 720 Pixel", 720],
    ])("Kameraauflösung %j", (value, height) => {
      expect(one("Kameraauflösung", value)).toEqual({
        webcam: { present: true, heightPx: height },
      });
    });
  });

  describe("webcam", () => {
    it.each([
      ["Webcam", "integriert", { present: true }],
      ["Webcam", "5.0 Megapixel", { present: true, megapixels: 5 }],
      ["Webcam", "2,1 Megapixel", { present: true, megapixels: 2.1 }],
      ["Kamerafunktion", "HD-fähig", { present: true }],
      ["Kamerafunktion", "IR-Kamera", { present: true, irCamera: true }],
      ["Ausstattung", "Fingerabdruckleser, Webcam, Hintergrundbeleuchtung", { present: true }],
      ["Ausstattung", "Infrarot-Kamera, Webcam", { present: true, irCamera: true }],
      ["Webcam", "nein", { present: false }],
      ["Ausstattung", "Tastatur beleuchtet, ohne Webcam", { present: false }],
    ] as const)("%s %j", (label, value, webcam) => {
      expect(one(label, value)).toEqual({ webcam });
    });

    it("combines the pieces stated in different rows", () => {
      const facts = fromDatasheet(
        new Map([
          ["Webcam", "integriert"],
          ["Kameraauflösung", "1920 x 1080 Pixel"],
          ["Ausstattung", "IR-Kamera, Fingerabdruckleser"],
        ]),
      );
      expect(facts.webcam).toEqual({ present: true, heightPx: 1080, irCamera: true });
    });

    it("lets a stated resolution outweigh a stray negation", () => {
      const facts = fromDatasheet(
        new Map([
          ["Webcam", "nein"],
          ["Kameraauflösung", "1280 x 720 Pixel"],
        ]),
      );
      expect(facts.webcam).toEqual({ present: true, heightPx: 720 });
    });

    it.each([
      ["Ausstattung", "Fingerabdruckleser, Hintergrundbeleuchtung"],
      ["Kamerafunktion", ""],
      ["Webcam", "  "],
    ])("never infers absence from %s %j", (label, value) => {
      expect(one(label, value)).toEqual({});
    });

    it("does not read an IR camera into a plain webcam", () => {
      expect(one("Ausstattung", "Webcam")).toEqual({ webcam: { present: true } });
    });
  });

  describe("unparseable values", () => {
    it.each([
      ["RAM", "nach Wahl"],
      ["RAM", "bis 8 GB"],
      ["SSD-Speicher", "-"],
      ["Helligkeit", "hell"],
      ["Markteinführung", "demnächst"],
      ["Markteinführung", "1"],
      ["Displayauflösung", "Full HD+"],
      ["Wattstunden", "viel"],
    ])("%s %j states no fact", (label, value) => {
      expect(one(label, value)).toEqual({});
    });
  });
});

describe("fromCharacteristics", () => {
  it("reads the tile shapes the listing carries", () => {
    expect(
      fromCharacteristics([
        "32 GB RAM",
        "DDR4",
        "1.000 GB SSD-Speicher",
        "Full HD",
        "Windows 11 Professional",
        "14 Zoll",
        "Akkulaufzeit 21 h",
      ]),
    ).toEqual({
      ramGb: 32,
      storageGb: 1000,
      storageKind: "ssd",
      displayHeightPx: 1080,
      osKind: "windows",
    });
  });

  it("splits non-breaking spaces like blanks", () => {
    expect(fromCharacteristics(["16 GB RAM", "512 GB SSD-Speicher"])).toEqual({
      ramGb: 16,
      storageGb: 512,
      storageKind: "ssd",
    });
  });

  it("reads bare storage kinds, Wi-Fi and no-OS values", () => {
    expect(fromCharacteristics(["eMMC", "Wi-Fi 6", "Free DOS"])).toEqual({
      storageKind: "emmc",
      wifiGeneration: 6,
      osKind: "none",
    });
  });

  it("agrees with the datasheet on the same values", () => {
    const tile = fromCharacteristics(["8 GB RAM", "256 GB SSD-Speicher", "HD Ready"]);
    const sheet = fromDatasheet(
      new Map([
        ["RAM", "8 GB"],
        ["SSD-Speicher", "256 GB"],
        ["Display-Technologie", "HD Ready"],
      ]),
    );
    expect(tile).toEqual(sheet);
  });

  it("reads a capacity without a kind when the tile names none", () => {
    expect(fromCharacteristics(["500 GB Festplattenspeicher"])).toEqual({ storageGb: 500 });
  });

  it.each([[[]], [["", "  "]], [["Gaming", "RGB", "Akkulaufzeit lang"]]])(
    "states nothing for %j",
    (values) => {
      expect(fromCharacteristics(values)).toEqual({});
    },
  );
});

describe("mergeFacts", () => {
  it("lets the first layer that states a fact win", () => {
    const sheet: ProductFacts = { ramGb: 16 };
    const tile: ProductFacts = { ramGb: 8, osKind: "windows" };
    expect(mergeFacts(sheet, tile)).toEqual({ ramGb: 16, osKind: "windows" });
    expect(mergeFacts(tile, sheet)).toEqual({ ramGb: 8, osKind: "windows" });
  });

  it("merges the pieces of the camera instead of picking one layer", () => {
    expect(
      mergeFacts(
        { webcam: { present: true, heightPx: 1080 } },
        { webcam: { present: true, heightPx: 720, irCamera: true } },
      ).webcam,
    ).toEqual({ present: true, heightPx: 1080, irCamera: true });
  });

  it("lets a stated absence stand alone", () => {
    expect(
      mergeFacts({ webcam: { present: false } }, { webcam: { present: true } }).webcam,
    ).toEqual({
      present: false,
    });
    expect(
      mergeFacts({ webcam: { present: true } }, { webcam: { present: false } }).webcam,
    ).toEqual({
      present: true,
    });
  });

  it("merges nothing into nothing", () => {
    expect(mergeFacts()).toEqual({});
    expect(mergeFacts({}, {})).toEqual({});
  });
});
