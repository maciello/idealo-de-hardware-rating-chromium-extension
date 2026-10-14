import { describe, expect, it } from "vitest";
import { extractGpuIdentity } from "../../../src";

describe("extractGpuIdentity", () => {
  it.each([
    ["NVIDIA GeForce RTX 5080", "geforce-rtx-5080", null, false],
    ["NVIDIA GeForce RTX 4060 (8GB)", "geforce-rtx-4060", 8, false],
    ["GeForce RTX 4060 Ti 16384 MB", "geforce-rtx-4060-ti", 16, false],
    ["NVIDIA GeForce RTX 4070 Ti SUPER 16 GB", "geforce-rtx-4070-ti-super", 16, false],
    ["RTX 3050 A Laptop GPU", "geforce-rtx-3050-a", null, true],
    ["GeForce GTX 1650 Ti with Max-Q Design", "geforce-gtx-1650-ti", null, true],
    ["GTX1660", "geforce-gtx-1660", null, false],
    ["AMD Radeon RX 7600M XT", "radeon-rx-7600m-xt", null, false],
    ["Radeon RX 7900 XTX", "radeon-rx-7900-xtx", null, false],
    ["AMD Radeon 8060S", "radeon-8060s", null, false],
    ["AMD Radeon 780M Graphics", "radeon-780m", null, false],
    ["Intel Arc A770M", "arc-a770m", null, false],
    ["Intel Arc 140V GPU", "arc-140v", null, false],
    ["Intel Iris Xe Graphics", "iris-xe", null, false],
    ["Intel UHD Graphics 770", "uhd-graphics-770", null, false],
    ["Intel HD Graphics 630", "hd-graphics-630", null, false],
    ["Intel HD 630", "hd-graphics-630", null, false],
    ["Intel HD Graphics P4600", "hd-graphics-p4600", null, false],
    ["Intel Iris Plus Graphics 655", "iris-plus-655", null, false],
    ["Intel Iris Pro Graphics 6200", "iris-pro-6200", null, false],
    ["Intel Iris Graphics 540", "iris-540", null, false],
    ["Intel Xe Graphics", "iris-xe", null, false],
    ["Intel Iris Xe Graphics", "iris-xe", null, false],
    ["Intel Iris Xe MAX Graphics", "iris-xe-max", null, false],
    ["NVIDIA RTX 2000 Ada", "rtx-ada-2000", null, false],
    ["RTX 2000 Ada Generation Laptop GPU", "rtx-ada-2000", null, true],
    ["NVIDIA RTX 2000E Ada Generation", "rtx-ada-2000e", null, false],
    ["NVIDIA RTX A500", "rtx-a500", null, false],
    ["NVIDIA Quadro RTX A4000", "rtx-a4000", null, false],
    ["RTX A2000 8GB Laptop GPU", "rtx-a2000", 8, true],
    ["NVIDIA RTX PRO 2000 [Blackwell]", "rtx-pro-2000-blackwell", null, false],
    ["NVIDIA RTX Pro 2000", "rtx-pro-2000-blackwell", null, false],
    ["RTX PRO 2000 Blackwell Generation Laptop GPU", "rtx-pro-2000-blackwell", null, true],
    ["NVIDIA T1200", "t-t1200", null, false],
    ["NVIDIA Quadro T400", "t-t400", null, false],
    ["T550 Laptop GPU", "t-t550", null, true],
    ["Quadro T1000 with Max-Q Design", "t-t1000", null, true],
  ])("%s -> %s", (text, key, memoryGb, laptop) => {
    const identity = extractGpuIdentity(text);
    expect(identity?.key).toBe(key);
    expect(identity?.memoryGb).toBe(memoryGb);
    expect(identity?.variant === "laptop").toBe(laptop);
  });

  it("reads VRAM only when the size directly follows the model, never system RAM", () => {
    const memoryOf = (text: string) => extractGpuIdentity(text)?.memoryGb;
    expect(memoryOf("Gaming-PC, RTX 3050 6GB, 16GB RAM, 240GB SSD")).toBe(6);
    expect(memoryOf("Gaming-PC, 16GB RAM, RTX 3050 6GB, 240GB SSD")).toBe(6);
    expect(memoryOf("RTX 3050 (6 GB)")).toBe(6);
    expect(memoryOf("RTX 5060 Ti 16GB")).toBe(16);
    expect(memoryOf("RTX 4060 8GB GDDR6")).toBe(8);
    expect(memoryOf("RTX 3050 6144 MB")).toBe(6);
    expect(memoryOf("i5 10400F - RTX 3050 - 16GB DDR4 - 512GB SSD")).toBeNull();
    expect(memoryOf("i5 10400F, RTX 3050, 16GB DDR4")).toBeNull();
    expect(memoryOf("RTX 3050 16GB DDR4")).toBeNull();
    expect(memoryOf("RTX 3050 16GB RAM")).toBeNull();
    expect(memoryOf("16GB RAM, RTX 3050")).toBeNull();
    expect(memoryOf("16GB RTX 3050")).toBeNull();
  });

  it("keeps system RAM in the residual so a full title is not mistaken for the plain model", () => {
    expect(extractGpuIdentity("RTX 3050 6GB, 16GB RAM")?.residual).toContain("16gb ram");
    expect(extractGpuIdentity("RTX 3050 6GB")?.residual).toBe("");
  });

  it("reports leftover text so decorated names are not mistaken for plain ones", () => {
    expect(extractGpuIdentity("GeForce RTX 3050 OEM")?.residual).toBe("oem");
    expect(extractGpuIdentity("Radeon 610M Ryzen 5 7645HX")?.residual).not.toBe("");
    expect(extractGpuIdentity("NVIDIA GeForce RTX 4060 (8GB)")?.residual).toBe("");
  });

  it("does not read other vendors' or other products' look-alikes as the new families", () => {
    expect(extractGpuIdentity("AMD Radeon HD 5500")).toBeNull();
    expect(extractGpuIdentity("ATI HD 4850")).toBeNull();
    expect(extractGpuIdentity("Lenovo ThinkPad T480")).toBeNull();
    expect(extractGpuIdentity("T14 Gen 3")).toBeNull();
    expect(extractGpuIdentity("Intel Iris Graphics")).toBeNull();
    expect(extractGpuIdentity("Intel HD Graphics")).toBeNull();
    expect(extractGpuIdentity("Intel Xe-LPG")).toBeNull();
    expect(extractGpuIdentity("RTX PRO")).toBeNull();
  });

  it("returns null instead of guessing", () => {
    expect(extractGpuIdentity("Quadro P2000")).toBeNull();
    expect(extractGpuIdentity("Intel Core i7-13700H")).toBeNull();
    expect(extractGpuIdentity("")).toBeNull();
  });
});
