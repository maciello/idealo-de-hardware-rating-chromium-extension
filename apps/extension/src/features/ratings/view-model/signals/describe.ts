import {
  RED_FLAG_IDS as FLAG,
  POWER_SIGNAL_IDS as POWER,
  type Signal,
  type SignalId,
  type SignalParamsById,
  WEBCAM_SIGNAL_IDS as WEBCAM,
} from "@idealo-hw/sensors";
import { formatInteger, formatTenths } from "../../../../ui/format";
import { SIGNAL_DETAILS as D, SIGNAL_LABELS } from "../../copy";

const NOT_STATED = D.unstated;

/** A figure the product may not state, as a number of at most one decimal. */
const figure = (value: number | undefined): string =>
  value === undefined ? NOT_STATED.figure : formatTenths(value);

const power = ({ tdpWatts, cpuMarkPerWatt }: SignalParamsById[typeof POWER.veryLow]): string =>
  D.power(formatInteger(tdpWatts), cpuMarkPerWatt === null ? null : formatInteger(cpuMarkPerWatt));

/** The sentence of each signal from its figures; fixed sentences ignore them. */
const DETAILS: { readonly [K in SignalId]: (params: SignalParamsById[K]) => string } = {
  [POWER.veryLow]: power,
  [POWER.veryHigh]: power,
  [FLAG.displayLowRes]: ({ heightPx, minHeightPx }) =>
    D.displayLowRes(figure(heightPx), figure(minHeightPx)),
  [FLAG.ramTiny]: ({ ramGb }) => D.ramTiny(figure(ramGb)),
  [FLAG.ramLow]: ({ ramGb }) => D.ramLow(figure(ramGb)),
  [FLAG.storageEmmc]: () => D.storageEmmc,
  [FLAG.storageHddOnly]: () => D.storageHddOnly,
  [FLAG.storageTiny]: ({ storageGb }) => D.storageTiny(figure(storageGb)),
  [FLAG.storageSmall]: ({ storageGb }) => D.storageSmall(figure(storageGb)),
  [FLAG.ramTypeOutdated]: ({ label, currentGeneration }) =>
    D.ramTypeOutdated(label ?? NOT_STATED.ramType, currentGeneration),
  [FLAG.wifiOld]: ({ generation, currentGeneration }) =>
    D.wifiOld(figure(generation), figure(currentGeneration)),
  [FLAG.displayDim]: ({ nits }) => D.displayDim(figure(nits)),
  [FLAG.batterySmall]: ({ wh }) => D.batterySmall(figure(wh)),
  [FLAG.modelOld]: ({ releaseYear, yearsAgo }) =>
    D.modelOld(releaseYear === undefined ? NOT_STATED.year : String(releaseYear), figure(yearsAgo)),
  [FLAG.usb2Only]: () => D.usb2Only,
  [FLAG.videoOutOld]: () => D.videoOutOld,
  [FLAG.noOs]: () => D.noOs,
  [WEBCAM.fullHd]: () => D.webcamFullHd,
  [WEBCAM.ir]: () => D.webcamIr,
  [WEBCAM.low]: () => D.webcamLow,
  [WEBCAM.none]: () => D.webcamNone,
};

const detailOf = <K extends SignalId>(id: K, params: SignalParamsById[K]): string =>
  DETAILS[id](params);

interface SignalText {
  label: string;
  detail: string;
}

/** What a signal says: its name and its sentence. */
export const describeSignal = ({ id, params }: Signal): SignalText => ({
  label: SIGNAL_LABELS[id],
  detail: detailOf(id, params),
});
