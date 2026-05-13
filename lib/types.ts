// Tariefkaart-snapshot voor één maand
export type Indexering = '15' | 'h';

export interface SupplierFormula {
  id: string;
  naam: string;
  product: string;
  /** Indexering: kwartier ('15') of uur ('h') */
  indexering: Indexering;
  /** Afname energieprijs (EUR/MWh excl. BTW) = afnameMult × Belpex + afnameOffset */
  afnameMult: number;
  afnameOffset: number;
  /** Injectie vergoeding (EUR/MWh excl. BTW) */
  injMult: number;
  injOffset: number;
  /** Vaste vergoeding leverancier (EUR/jaar excl. 6% BTW) */
  vasteJaarExclBTW: number;
  /** Menselijk leesbare formule (afname + injectie) — voor weergave */
  formuleAfname: string;
  formuleInjectie: string;
  /** Bron-URL van tariefkaart */
  bronUrl: string;
  bronNaam: string;
  /** Optionele opmerking (bv. coöperant vereist) */
  opmerking?: string;
  /** True als formule niet officieel gepubliceerd → schatting */
  schatting?: boolean;
}

export interface DnbTarif {
  code: string;
  naam: string;
  /** €/kW/jaar capaciteitstarief */
  capKWj: number;
  /** €/kWh afname distributie */
  afnKWh: number;
  /** €/kWh ODV */
  odvKWh: number;
  /** €/kWh toeslagen */
  toesKWh: number;
  /** €/jaar databeheer */
  dataJaar: number;
}

export interface HeffingenSnapshot {
  /** c€/kWh — bijzondere accijns (eerste schijf, residentieel) */
  bijzondereAccijns: number;
  /** c€/kWh — energiebijdrage */
  energiebijdrage: number;
  /** c€/kWh — totale groene-stroom + WKK certificaten (gemiddeld) */
  certificaten: number;
  /** % BTW residentieel */
  btw: number;
  /** EUR/maand — Vlaamse bijdrage Energiefonds (residentieel = 0) */
  energiefondsPerMaand: number;
}

export interface MaandSnapshot {
  /** YYYY-MM, bv "2026-05" */
  maand: string;
  /** Datum waarop deze snapshot is genomen (ISO) */
  scrapeDatum: string;
  /** Leveranciers en hun formules voor deze maand */
  suppliers: SupplierFormula[];
  /** Distributietarieven (typisch jaarlijks gewijzigd, maar per maand opgeslagen voor consistentie) */
  dnbTarifs: Record<string, DnbTarif>;
  /** Heffingen + accijns + BTW */
  heffingen: HeffingenSnapshot;
  /** Geschatte jaargemiddelde Belpex EUR/MWh — voor jaarsimulatie */
  schattingen: {
    belpexJaarAfname: number;
    belpexJaarInjectie: number;
  };
  /** Optionele changelog t.o.v. vorige maand */
  changelog?: string[];
}

export interface MaandIndex {
  /** Lijst van beschikbare maanden, sortbaar string */
  beschikbareMaanden: string[];
  /** Meest recente maand */
  laatsteMaand: string;
}

export interface PostcodeInfo { gemeente: string; dnb: string; }
