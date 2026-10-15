import bwipjs from "bwip-js/node";

export function qrSvg(text: string): string {
  return bwipjs.toSVG({ bcid: "qrcode", text });
}

export function code128Svg(text: string): string {
  return bwipjs.toSVG({ bcid: "code128", text, height: 8, includetext: false });
}
