import type { DnbTarif, HeffingenSnapshot, SupplierFormula } from './types';

export interface BerekeningInputs {
  epex: number;             // EUR/MWh
  dnb: DnbTarif | null;
  heffingen: HeffingenSnapshot;
  incDistributie: boolean;
  incHeffingen: boolean;
  incBtw: boolean;
  incCertificaten: boolean;
}

/** Marginale afnameprijs in c€/kWh (één extra kWh bij gegeven EPEX) */
export function marginaleAfname(sup: SupplierFormula, inp: BerekeningInputs): number {
  const energieEMWh = sup.afnameMult * inp.epex + sup.afnameOffset;
  let total = energieEMWh / 10; // c€/kWh excl BTW
  if (inp.incCertificaten) total += inp.heffingen.certificaten;
  if (inp.incDistributie && inp.dnb) {
    total += (inp.dnb.afnKWh + inp.dnb.odvKWh + inp.dnb.toesKWh) * 100;
  }
  if (inp.incHeffingen) {
    total += inp.heffingen.bijzondereAccijns + inp.heffingen.energiebijdrage;
  }
  if (inp.incBtw) total *= 1 + inp.heffingen.btw / 100;
  return total;
}

/** Marginale injectieprijs in c€/kWh (geen BTW voor particulier) */
export function marginaleInjectie(sup: SupplierFormula, inp: BerekeningInputs): number {
  return (sup.injMult * inp.epex + sup.injOffset) / 10;
}

export interface JaarInputs {
  dnb: DnbTarif;
  heffingen: HeffingenSnapshot;
  belpexAfname: number;
  belpexInjectie: number;
  jaarVerbruik: number;
  jaarInjectie: number;
  maandPiekKW: number;
  incCertificaten: boolean;
}

export interface JaarResult {
  energieAfname: number;
  distributie: number;
  capaciteit: number;
  databeheer: number;
  heffingen: number;
  certificaten: number;
  vasteLev: number;
  subtotalExclBtw: number;
  btwBedrag: number;
  totaalAfnameInclBtw: number;
  injectieInkomsten: number;
  energiefonds: number;
  netto: number;
}

export function jaarBerekening(sup: SupplierFormula, inp: JaarInputs): JaarResult {
  const piek = Math.max(2.5, inp.maandPiekKW);
  const energieAfname = ((sup.afnameMult * inp.belpexAfname + sup.afnameOffset) / 10) * inp.jaarVerbruik / 100;
  const distributie = (inp.dnb.afnKWh + inp.dnb.odvKWh + inp.dnb.toesKWh) * inp.jaarVerbruik;
  const capaciteit = inp.dnb.capKWj * piek;
  const databeheer = inp.dnb.dataJaar;
  const heffingen = (inp.heffingen.bijzondereAccijns + inp.heffingen.energiebijdrage) * inp.jaarVerbruik / 100;
  const certificaten = inp.incCertificaten ? inp.heffingen.certificaten * inp.jaarVerbruik / 100 : 0;
  const vasteLev = sup.vasteJaarExclBTW;
  const subtotalExclBtw = energieAfname + distributie + capaciteit + databeheer + heffingen + certificaten + vasteLev;
  const btwBedrag = subtotalExclBtw * inp.heffingen.btw / 100;
  const totaalAfnameInclBtw = subtotalExclBtw + btwBedrag;
  const injectieInkomsten = ((sup.injMult * inp.belpexInjectie + sup.injOffset) / 10) * inp.jaarInjectie / 100;
  const energiefonds = inp.heffingen.energiefondsPerMaand * 12;
  const netto = totaalAfnameInclBtw + energiefonds - injectieInkomsten;
  return { energieAfname, distributie, capaciteit, databeheer, heffingen, certificaten, vasteLev,
    subtotalExclBtw, btwBedrag, totaalAfnameInclBtw, injectieInkomsten, energiefonds, netto };
}

export function fmtEur(n: number, decimals = 0): string {
  if (!isFinite(n)) return '—';
  return '€ ' + n.toLocaleString('nl-BE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
export function fmtNum(n: number, decimals = 2): string {
  if (!isFinite(n)) return '—';
  return n.toLocaleString('nl-BE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
export function fmtPct(n: number, decimals = 1): string {
  if (!isFinite(n)) return '—';
  return (n >= 0 ? '+' : '') + n.toLocaleString('nl-BE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' %';
}
