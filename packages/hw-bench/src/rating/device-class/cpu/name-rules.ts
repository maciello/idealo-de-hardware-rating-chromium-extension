import type { NameRule } from "../membership";

/**
 * Closed rules for CPU names, checked in this order BEFORE the identity parser (a "(Virtual)" Apple M1 must not become an
 * Apple M1). Later entries are the chips the parser does not read at all.
 */
export const CPU_NAME_RULES: readonly NameRule[] = [
  { rule: "virtual-machine", result: "excluded", test: /^virtual\b|\(virtual\)|\bvirtual cpu\b/ },
  { rule: "xeon-w-workstation", result: "desktop", test: /^intel xeon w\d?-|^intel xeon w\d{4}/ },
  { rule: "nvidia-gb10", result: "desktop", test: /^nvidia gb10\b|\bgb10\b/ },
  {
    rule: "snapdragon-x-and-compute",
    result: "laptop",
    test: /snapdragon x\d?\b|snapdragon x\d? (?:elite|plus)|^(?:qualcomm )?snapdragon (?:7c|8c|8cx)\b/,
  },
  { rule: "kompanio-chromebook", result: "laptop", test: /kompanio/ },
  {
    rule: "intel-iot-e-suffix",
    result: "excluded",
    test: /^intel (?:core i[3579]|celeron|pentium)[ -]+\w*?\d{4,5}[a-z]{0,3}\d?e\b/,
  },
  { rule: "apple-a18-pro-macbook", result: "laptop", test: /^apple a18 pro\b/ },
  { rule: "server-atom-c", result: "excluded", test: /^intel atom (?:c|p)\d/ },
  { rule: "atom-x-mini-pc", result: "desktop", test: /^intel atom x\d/ },
  { rule: "intel-processor-n-u", result: "both", test: /^intel (?:processor )?[nu]\d{2,3}\b/ },
  { rule: "handheld-ryzen-z", result: "laptop", test: /^amd ryzen (?:ai )?z\d/ },
  {
    rule: "bare-core-or-android",
    result: "excluded",
    test: /^arm\b|\barmv\d|aarch64|\bcortex\b|\bneoverse\b|\bkryo\b|\bfalkor\b|\bfirestorm\b|\bavalanche\b|android|aosp|emulator|\bboard\b|\bevb\d?\b/,
  },
  {
    rule: "dev-board-soc",
    result: "excluded",
    test: /^qti\b|^qct\b|dragonwing|\b(?:msm|apq|qcm|qcs)\d{3,4}|^sun\d+i|^sc\d{4}|^uis\d|^hi\d{4}|^rk\d{4}|^mtk\d|^nxp\b|^synaptics|^hardkernel|^google (?:gs|r\d)|^pxa\d|^qemu|^virt-|^stratovirt|common kvm|rockchip|allwinner|amlogic|spreadtrum|unisoc|broadcom|bcm\d{4}|nvidia tegra|cix p\d|\bimx\b|exynos auto/,
  },
  {
    rule: "phone-tablet-soc",
    result: "excluded",
    test: /snapdragon|qualcomm|dimensity|helio|mediatek|\bmt\d{4}|exynos|tensor|kirin|hisilicon|apple a\d|samsung|\bsm\d{4}|\bsdm\d{3}/,
  },
  {
    rule: "server",
    result: "excluded",
    test: /\bxeon\b|\bepyc\b|\bopteron\b|\bampere\b|\bmontage\b|\bthunderx\b|\bx-gene\b/,
  },
  {
    rule: "embedded",
    result: "excluded",
    test: /ryzen embedded|\bryzen v\d|\bamd gx-|\bamd rx-|\bamd r-series|\bembedded\b|\bgeode\b/,
  },
  {
    rule: "not-sold-in-de-retail",
    result: "excluded",
    test: /hygon|zhaoxin|phytium|centaurhauls|kunpeng|loongson/,
  },
];
