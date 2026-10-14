import { HOST } from "./constants";

/** idealo's country sites and any of their subdomains (www.idealo.de, api.idealo.com, ...). */
export const isIdealoHost = (hostname: string): boolean => HOST.test(hostname.toLowerCase());
