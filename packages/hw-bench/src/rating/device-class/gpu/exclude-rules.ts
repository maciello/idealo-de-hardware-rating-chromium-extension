import type { NameRule } from "../membership";

/** GPU names checked before the identity parser: nothing here is a buyable PC graphics part, or needs its host SoC. */
export const GPU_EXCLUDE_RULES: readonly NameRule[] = [
  {
    rule: "vgpu-profile",
    result: "excluded",
    test: /^(?:nvidia )?[a-z]*\d+[a-z]?(?:-\d+)?-\d+[abcq]\b|\bgrid\b|\bvgpu\b/,
  },
  {
    rule: "virtual-display-adapter",
    result: "excluded",
    test: /\bidd|displaylink|mirror driver|mirage|basic (?:display|render)|miracast|logmein|parsec|citrix|vmware|virtualbox|hyper-v|usbdisplay|usb display|indirect display|display device|svga|virtio|qxl|remote|gdihook|cxdisplay|adapter$|\bpci\\ven_/,
  },
  {
    rule: "datacenter-accelerator",
    result: "excluded",
    test: /^(?:nvidia |ndivia )?(?:tesla )?(?:a(?:2|10g?|16|30|40|100|800)|l(?:4|20|40s?)|t4|h(?:20|100|200|800)|v100s?|p(?:4|40|100)|k(?:20|40|80)|m(?:4|40|60)|b200)\b|instinct|\bmi\d{2,3}\b/,
  },
  { rule: "mining-card", result: "excluded", test: /\bcmp \d+hx\b/ },
  {
    rule: "engineering-sample",
    result: "excluded",
    test: /eng sample|^custom gpu|^chell |^extension adapter/,
  },
  {
    rule: "virtualised-or-datacenter-radeon",
    result: "excluded",
    test: /mxgpu|radeon pro v\d{3}|radeon instinct/,
  },
  {
    rule: "pro-display-controller",
    result: "excluded",
    test: /^(?:barco|eizo|matrox)\b|\beizo\b/,
  },
  {
    rule: "windows-on-arm-and-chromebook-gpu",
    result: "laptop",
    test: /^(?:qualcomm )?adreno (?:x\d|618|68\d|690)|^arm immortalis g925/,
  },
  {
    rule: "phone-embedded-gpu",
    result: "excluded",
    test: /adreno|\bmali\b|powervr|immortalis|glenfly|arise|videocore|vivante|tegra|moore threads|zx c|fantasy|xdx|sangfor|tensor 1/,
  },
];
