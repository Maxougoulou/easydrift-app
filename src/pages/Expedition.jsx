import { useState, useMemo } from 'react';
import { THEME } from '../lib/theme';
import { TopBar } from '../components/TopBar';
import { Btn } from '../components/ui';
import { useAppContext } from '../lib/AppContext';

// ── CONFIGURATION ─────────────────────────────────────────────────────────────

const DEFAULT_ZONES = [
  { id: 'france',     name: 'France Métropole',                   ratePalette: 107, rateColis: 52,  delay: '2-3 j' },
  { id: 'belgique',   name: 'Belgique',                           ratePalette: 130, rateColis: 85,  delay: '3-4 j' },
  { id: 'eu_proche',  name: 'Europe proche (DE, CH, IT, NL, AT)', ratePalette: 175, rateColis: 92,  delay: '4-6 j' },
  { id: 'eu_loin',    name: 'Europe lointain (SE, SI, GR, CY…)',  ratePalette: 265, rateColis: 140, delay: '6-10 j' },
  { id: 'uk',         name: 'Royaume-Uni',                        ratePalette: 240, rateColis: 110, delay: '4-7 j' },
  { id: 'domtom',     name: 'DOM-TOM',                            ratePalette: 380, rateColis: 80,  delay: '7-14 j' },
  { id: 'middleeast', name: 'Moyen-Orient (Dubai…)',              ratePalette: 600, rateColis: 450, delay: '10-15 j' },
  { id: 'usa',        name: 'USA / Canada',                       ratePalette: 650, rateColis: 200, delay: '10-15 j' },
  { id: 'world',      name: 'Reste du monde',                     ratePalette: 820, rateColis: 250, delay: '15-25 j' },
];

const DEFAULT_CONFIG = {
  ringsPerPalette: { 'DTS 230×660': 6, 'DTS 200×600': 10, 'DTS 180×560': 12 },
  emballagePalette: 8,
  manutentionPalette: 4,
  emballageColis: 3,
};

const RING_TYPES = ['DTS 230×660', 'DTS 200×600', 'DTS 180×560'];

// ── DÉPARTEMENTS FRANÇAIS ─────────────────────────────────────────────────────

const DEPT = {
  '01':'Ain','02':'Aisne','03':'Allier','04':'Alpes-de-HteP.','05':'Htes-Alpes',
  '06':'Alpes-Maritimes','07':'Ardèche','08':'Ardennes','09':'Ariège','10':'Aube',
  '11':'Aude','12':'Aveyron','13':'Bouches-du-Rhône','14':'Calvados','15':'Cantal',
  '16':'Charente','17':'Charente-Maritime','18':'Cher','19':'Corrèze','21':'Côte-d\'Or',
  '22':'Côtes-d\'Armor','23':'Creuse','24':'Dordogne','25':'Doubs','26':'Drôme',
  '27':'Eure','28':'Eure-et-Loir','29':'Finistère','30':'Gard','31':'Haute-Garonne',
  '32':'Gers','33':'Gironde','34':'Hérault','35':'Ille-et-Vilaine','36':'Indre',
  '37':'Indre-et-Loire','38':'Isère','39':'Jura','40':'Landes','41':'Loir-et-Cher',
  '42':'Loire','43':'Haute-Loire','44':'Loire-Atlantique','45':'Loiret','46':'Lot',
  '47':'Lot-et-Garonne','48':'Lozère','49':'Maine-et-Loire','50':'Manche','51':'Marne',
  '52':'Haute-Marne','53':'Mayenne','54':'Meurthe-et-Moselle','55':'Meuse','56':'Morbihan',
  '57':'Moselle','58':'Nièvre','59':'Nord','60':'Oise','61':'Orne','62':'Pas-de-Calais',
  '63':'Puy-de-Dôme','64':'Pyrénées-Atl.','65':'Htes-Pyrénées','66':'Pyrénées-Or.',
  '67':'Bas-Rhin','68':'Haut-Rhin','69':'Rhône','70':'Haute-Saône','71':'Saône-et-Loire',
  '72':'Sarthe','73':'Savoie','74':'Haute-Savoie','75':'Paris','76':'Seine-Maritime',
  '77':'Seine-et-Marne','78':'Yvelines','79':'Deux-Sèvres','80':'Somme','81':'Tarn',
  '82':'Tarn-et-Garonne','83':'Var','84':'Vaucluse','85':'Vendée','86':'Vienne',
  '87':'Haute-Vienne','88':'Vosges','89':'Yonne','90':'Terr. de Belfort',
  '91':'Essonne','92':'Hauts-de-Seine','93':'Seine-Saint-Denis','94':'Val-de-Marne',
  '95':'Val-d\'Oise',
};

// ── HELPERS ───────────────────────────────────────────────────────────────────

function extractPostal(str) {
  return str?.match(/\b(\d{4,5})\b/)?.[1] ?? null;
}

function parseDestination(input) {
  const postal = extractPostal(input);
  if (!postal) return { zoneId: null, deptCode: null, label: null };
  if (postal.length === 5) {
    if (postal.startsWith('97')) return { zoneId: 'domtom', deptCode: null, label: 'DOM-TOM' };
    const deptCode = postal.substring(0, 2);
    return { zoneId: 'france', deptCode, label: `Dept. ${deptCode} — ${DEPT[deptCode] ?? ''}` };
  }
  // 4-digit codes: Belgium mostly
  return { zoneId: 'belgique', deptCode: null, label: 'Belgique (code 4 chiffres)' };
}

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

// ── HISTORIQUE PRÉ-CHARGÉ ────────────────────────────────────────────────────

const INITIAL_HISTORY = [
  { id: 1,   date:'2026-05-28', invoice:'FC207899', destination:'78310 Maurepas (FR)',        zoneId:'france',     ringType:'DTS 200×600', qty:'4',  palettes:'0', colis:'2', costJeepest:'75.53',   chargedClient:'', notes:'2 colis' },
  { id: 2,   date:'2026-05-28', invoice:'FC207899', destination:'5640 Mettet (BE)',            zoneId:'belgique',   ringType:'DTS 200×600', qty:'4',  palettes:'1', colis:'0', costJeepest:'102.73',  chargedClient:'', notes:'1 palette' },
  { id: 3,   date:'2026-05-28', invoice:'FC207899', destination:'88100 St Die des Vosges',     zoneId:'france',     ringType:'DTS 200×600', qty:'10', palettes:'1', colis:'0', costJeepest:'150.00',  chargedClient:'', notes:'1 palette' },
  { id: 4,   date:'2026-05-28', invoice:'FC207899', destination:'44130 Fay de Bretagne',       zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'58.43',   chargedClient:'', notes:'1 colis' },
  { id: 5,   date:'2026-04-30', invoice:'FC206665', destination:'86150 Le Vigeant (FR)',       zoneId:'france',     ringType:'DTS 200×600', qty:'8',  palettes:'1', colis:'0', costJeepest:'118.52',  chargedClient:'', notes:'1 palette' },
  { id: 6,   date:'2026-04-30', invoice:'FC206665', destination:'4047 Limassol (Chypre)',      zoneId:'eu_loin',    ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'145.00',  chargedClient:'', notes:'1 colis' },
  { id: 7,   date:'2026-04-30', invoice:'FC206665', destination:'17220 Saint Medard (FR)',     zoneId:'france',     ringType:'DTS 200×600', qty:'8',  palettes:'1', colis:'0', costJeepest:'105.81',  chargedClient:'', notes:'1 palette' },
  { id: 8,   date:'2026-04-01', invoice:'FC205366', destination:'3200 Aarschot (BE)',          zoneId:'belgique',   ringType:'DTS 200×600', qty:'3',  palettes:'1', colis:'0', costJeepest:'102.76',  chargedClient:'', notes:'1 palette' },
  { id: 9,   date:'2026-04-01', invoice:'FC205366', destination:'69720 St Laurent de Mure',    zoneId:'france',     ringType:'DTS 200×600', qty:'10', palettes:'1', colis:'0', costJeepest:'101.22',  chargedClient:'', notes:'1 palette' },
  { id: 10,  date:'2026-04-01', invoice:'FC205366', destination:'63100 Chavaroux (FR)',        zoneId:'france',     ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'64.68',   chargedClient:'', notes:'1 colis' },
  { id: 11,  date:'2025-12-23', invoice:'FC202086', destination:'1400 Nivelles (BE)',          zoneId:'belgique',   ringType:'DTS 200×600', qty:'6',  palettes:'1', colis:'0', costJeepest:'131.01',  chargedClient:'', notes:'1 palette' },
  { id: 12,  date:'2025-12-23', invoice:'FC202086', destination:'69670 Vaugneray (FR)',        zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'57.18',   chargedClient:'', notes:'1 colis' },
  { id: 13,  date:'2025-12-23', invoice:'FC202086', destination:'1304 Cossonay (CH)',          zoneId:'eu_proche',  ringType:'DTS 200×600', qty:'4',  palettes:'0', colis:'2', costJeepest:'103.44',  chargedClient:'', notes:'2 colis' },
  { id: 14,  date:'2025-11-27', invoice:'FC201287', destination:'63000 Clermont-Ferrand',      zoneId:'france',     ringType:'DTS 200×600', qty:'4',  palettes:'0', colis:'2', costJeepest:'87.75',   chargedClient:'', notes:'2 colis' },
  { id: 15,  date:'2025-11-27', invoice:'FC201287', destination:'Dubai (EAU)',                 zoneId:'middleeast', ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'447.85',  chargedClient:'', notes:'1 colis DTS56' },
  { id: 16,  date:'2025-11-27', invoice:'FC201287', destination:'1130 Bruxelles (BE)',         zoneId:'belgique',   ringType:'DTS 200×600', qty:'12', palettes:'1', colis:'0', costJeepest:'195.22',  chargedClient:'', notes:'1 palette' },
  { id: 17,  date:'2025-11-03', invoice:'FC200530', destination:'79260 La Creche (FR)',        zoneId:'france',     ringType:'DTS 180×560', qty:'4',  palettes:'0', colis:'2', costJeepest:'67.56',   chargedClient:'', notes:'2 colis DTS56' },
  { id: 18,  date:'2025-11-03', invoice:'FC200530', destination:'80100 Abbeville (FR)',        zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'66.13',   chargedClient:'', notes:'1 colis' },
  { id: 19,  date:'2025-11-03', invoice:'FC200530', destination:'33600 Pessac (FR)',           zoneId:'france',     ringType:'DTS 200×600', qty:'4',  palettes:'0', colis:'2', costJeepest:'84.89',   chargedClient:'', notes:'2 colis' },
  { id: 20,  date:'2025-04-29', invoice:'FC193200', destination:'26300 Alixan (FR)',           zoneId:'france',     ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'49.47',   chargedClient:'', notes:'1 colis DTS56' },
  { id: 21,  date:'2025-04-29', invoice:'FC193200', destination:'1382 Weesp (NL)',             zoneId:'eu_proche',  ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'77.50',   chargedClient:'', notes:'1 colis' },
  { id: 22,  date:'2025-04-29', invoice:'FC193200', destination:'79260 La Creche (FR)',        zoneId:'france',     ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'46.47',   chargedClient:'', notes:'1 colis DTS56' },
  { id: 23,  date:'2025-04-29', invoice:'FC193200', destination:'63500 Issoire (FR)',          zoneId:'france',     ringType:'DTS 200×600', qty:'4',  palettes:'0', colis:'2', costJeepest:'84.10',   chargedClient:'', notes:'2 colis' },
  { id: 24,  date:'2025-03-31', invoice:'FC191791', destination:'90340 Chevremont (FR)',       zoneId:'france',     ringType:'DTS 180×560', qty:'16', palettes:'1', colis:'0', costJeepest:'105.99',  chargedClient:'', notes:'1 palette - 12 DTS56+4 DTS60' },
  { id: 25,  date:'2025-03-31', invoice:'FC191791', destination:'9300 Aalst (BE)',             zoneId:'belgique',   ringType:'DTS 230×660', qty:'2',  palettes:'0', colis:'1', costJeepest:'84.05',   chargedClient:'', notes:'2 DTS66' },
  { id: 26,  date:'2025-03-31', invoice:'FC191791', destination:'3305 Vransko (Slovénie)',     zoneId:'eu_loin',    ringType:'DTS 200×600', qty:'24', palettes:'1', colis:'0', costJeepest:'327.47',  chargedClient:'', notes:'palette mixte' },
  { id: 27,  date:'2025-02-28', invoice:'FC190640', destination:'5640 Mettet (BE)',            zoneId:'belgique',   ringType:'DTS 230×660', qty:'4',  palettes:'1', colis:'0', costJeepest:'154.23',  chargedClient:'', notes:'4 DTS66' },
  { id: 28,  date:'2025-02-28', invoice:'FC190640', destination:'17220 Saint Medard (FR)',     zoneId:'france',     ringType:'DTS 200×600', qty:'8',  palettes:'1', colis:'0', costJeepest:'115.09',  chargedClient:'', notes:'1 palette' },
  { id: 29,  date:'2025-02-28', invoice:'FC190640', destination:'88100 Saint Die (FR)',        zoneId:'france',     ringType:'DTS 200×600', qty:'8',  palettes:'1', colis:'0', costJeepest:'115.09',  chargedClient:'', notes:'4 DTS60+4 DTS66' },
  { id: 30,  date:'2025-02-28', invoice:'FC190640', destination:'17220 Saint Medard (FR)',     zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'48.52',   chargedClient:'', notes:'1 colis' },
  { id: 31,  date:'2025-01-31', invoice:'FC189631', destination:'32606 Gainesville FL (USA)',  zoneId:'usa',        ringType:'DTS 200×600', qty:'24', palettes:'0', colis:'1', costJeepest:'208.00',  chargedClient:'', notes:'24 pièces' },
  { id: 32,  date:'2025-01-31', invoice:'FC189631', destination:'77320 La Ferté (FR)',         zoneId:'france',     ringType:'DTS 200×600', qty:'4',  palettes:'1', colis:'0', costJeepest:'79.95',   chargedClient:'', notes:'1 palette' },
  { id: 33,  date:'2025-01-31', invoice:'FC189631', destination:'69540 Irigny (FR)',           zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'64.12',   chargedClient:'', notes:'1 colis' },
  { id: 34,  date:'2025-01-31', invoice:'FC189631', destination:'63118 Cebazat (FR)',          zoneId:'france',     ringType:'DTS 200×600', qty:'6',  palettes:'1', colis:'0', costJeepest:'88.30',   chargedClient:'', notes:'1 palette' },
  { id: 35,  date:'2024-12-23', invoice:'FC188738', destination:'3305 Vransko (Slovénie)',     zoneId:'eu_loin',    ringType:'DTS 200×600', qty:'4',  palettes:'1', colis:'0', costJeepest:'250.92',  chargedClient:'', notes:'1 palette' },
  { id: 36,  date:'2024-12-23', invoice:'FC188738', destination:'69720 Saint Laurent (FR)',    zoneId:'france',     ringType:'DTS 200×600', qty:'10', palettes:'1', colis:'0', costJeepest:'113.66',  chargedClient:'', notes:'1 palette' },
  { id: 37,  date:'2024-11-29', invoice:'FC187898', destination:'5640 Mettet (BE)',            zoneId:'belgique',   ringType:'DTS 230×660', qty:'3',  palettes:'0', colis:'1', costJeepest:'107.92',  chargedClient:'', notes:'3 DTS66' },
  { id: 38,  date:'2024-11-29', invoice:'FC187898', destination:'85200 Fontenay le Comte (FR)',zoneId:'france',     ringType:'DTS 200×600', qty:'4',  palettes:'1', colis:'0', costJeepest:'75.64',   chargedClient:'', notes:'1 palette' },
  { id: 39,  date:'2024-11-29', invoice:'FC187898', destination:'63200 Riom (FR)',             zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'54.47',   chargedClient:'', notes:'1 colis' },
  { id: 40,  date:'2024-11-29', invoice:'FC187898', destination:'1020 Laeken (BE)',            zoneId:'belgique',   ringType:'DTS 200×600', qty:'4',  palettes:'1', colis:'0', costJeepest:'104.03',  chargedClient:'', notes:'1 palette' },
  { id: 41,  date:'2024-11-29', invoice:'FC187898', destination:'91310 Linas (FR)',            zoneId:'france',     ringType:'DTS 200×600', qty:'40', palettes:'2', colis:'0', costJeepest:'257.46',  chargedClient:'', notes:'2 palettes 40 DTS60' },
  { id: 42,  date:'2024-11-29', invoice:'FC187898', destination:'1130 Bruxelles (BE)',         zoneId:'belgique',   ringType:'DTS 200×600', qty:'7',  palettes:'1', colis:'0', costJeepest:'166.82',  chargedClient:'', notes:'3 DTS60+4 DTS66' },
  { id: 43,  date:'2024-09-30', invoice:'FC185902', destination:'34130 Mauguio (FR)',          zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'57.93',   chargedClient:'', notes:'1 colis' },
  { id: 44,  date:'2024-09-30', invoice:'FC185902', destination:'21700 Nuits St Georges (FR)', zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'61.36',   chargedClient:'', notes:'1 colis' },
  { id: 45,  date:'2024-09-30', invoice:'FC185902', destination:'5640 Mettet (BE)',            zoneId:'belgique',   ringType:'DTS 200×600', qty:'42', palettes:'1', colis:'0', costJeepest:'143.54',  chargedClient:'', notes:'2 DTS56+40 DTS60' },
  { id: 46,  date:'2024-09-30', invoice:'FC185902', destination:'1130 Bruxelles (BE)',         zoneId:'belgique',   ringType:'DTS 200×600', qty:'8',  palettes:'1', colis:'0', costJeepest:'198.14',  chargedClient:'', notes:'1 palette 8 DTS60' },
  { id: 47,  date:'2024-08-28', invoice:'FC184669', destination:'85200 Fontenay le Comte (FR)',zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'54.38',   chargedClient:'', notes:'1 colis' },
  { id: 48,  date:'2024-08-28', invoice:'FC184669', destination:'15127 Athènes (Grèce)',       zoneId:'eu_loin',    ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'137.40',  chargedClient:'', notes:'1 colis' },
  { id: 49,  date:'2024-08-28', invoice:'FC184669', destination:'91460 Marcoussis (FR)',       zoneId:'france',     ringType:'DTS 200×600', qty:'16', palettes:'1', colis:'0', costJeepest:'151.27',  chargedClient:'', notes:'1 palette' },
  { id: 50,  date:'2024-08-28', invoice:'FC184669', destination:'79260 La Creche (FR)',        zoneId:'france',     ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'48.59',   chargedClient:'', notes:'1 colis DTS56' },
  { id: 51,  date:'2024-08-28', invoice:'FC184669', destination:'2440 Geel (BE)',              zoneId:'belgique',   ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'83.31',   chargedClient:'', notes:'1 colis' },
  { id: 52,  date:'2024-08-28', invoice:'FC184669', destination:'69720 Saint Laurent (FR)',    zoneId:'france',     ringType:'DTS 200×600', qty:'20', palettes:'1', colis:'0', costJeepest:'143.56',  chargedClient:'', notes:'réception stock' },
  { id: 53,  date:'2024-08-28', invoice:'FC184669', destination:'1304 Cossonay (CH)',          zoneId:'eu_proche',  ringType:'DTS 200×600', qty:'4',  palettes:'0', colis:'2', costJeepest:'122.62',  chargedClient:'', notes:'2 colis' },
  { id: 54,  date:'2024-06-27', invoice:'FC182583', destination:'76120 Le Grand Quevilly (FR)',zoneId:'france',     ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'39.53',   chargedClient:'', notes:'2 DTS56' },
  { id: 55,  date:'2024-06-27', invoice:'FC182583', destination:'63720 Chavaroux (FR)',        zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'42.15',   chargedClient:'', notes:'1 colis' },
  { id: 56,  date:'2024-06-27', invoice:'FC182583', destination:'01000 Bourg-en-Bresse (FR)', zoneId:'france',     ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'40.32',   chargedClient:'', notes:'2 DTS56' },
  { id: 57,  date:'2024-06-27', invoice:'FC182583', destination:'69720 Saint Laurent (FR)',    zoneId:'france',     ringType:'DTS 200×600', qty:'20', palettes:'1', colis:'0', costJeepest:'143.56',  chargedClient:'', notes:'20 DTS60 stock' },
  { id: 58,  date:'2024-06-27', invoice:'FC182583', destination:'3305 Vransko (Slovénie)',     zoneId:'eu_loin',    ringType:'DTS 200×600', qty:'10', palettes:'1', colis:'0', costJeepest:'312.72',  chargedClient:'', notes:'1 palette' },
  { id: 59,  date:'2024-06-27', invoice:'FC182583', destination:'39240 Arinthod (FR)',         zoneId:'france',     ringType:'DTS 180×560', qty:'1',  palettes:'0', colis:'1', costJeepest:'38.31',   chargedClient:'', notes:'1 DTS56' },
  { id: 60,  date:'2024-06-27', invoice:'FC182583', destination:'69670 Vaugneray (FR)',        zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'48.27',   chargedClient:'', notes:'1 colis' },
  { id: 61,  date:'2024-06-27', invoice:'FC182583', destination:'90340 Chevremont (FR)',       zoneId:'france',     ringType:'DTS 180×560', qty:'10', palettes:'1', colis:'0', costJeepest:'87.73',   chargedClient:'', notes:'10 DTS56' },
  { id: 62,  date:'2024-06-27', invoice:'FC182583', destination:'63500 Issoire (FR)',          zoneId:'france',     ringType:'DTS 200×600', qty:'4',  palettes:'0', colis:'2', costJeepest:'71.61',   chargedClient:'', notes:'2 colis' },
  { id: 63,  date:'2024-06-27', invoice:'FC182583', destination:'18000 Bourges (FR)',          zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'50.13',   chargedClient:'', notes:'1 colis' },
  { id: 64,  date:'2024-06-27', invoice:'FC182583', destination:'76260 Longroy (FR)',          zoneId:'france',     ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'50.13',   chargedClient:'', notes:'2 DTS56' },
  { id: 65,  date:'2024-06-27', invoice:'FC182583', destination:'69720 Saint Laurent (FR)',    zoneId:'france',     ringType:'DTS 200×600', qty:'12', palettes:'1', colis:'0', costJeepest:'116.11',  chargedClient:'', notes:'1 palette' },
  { id: 66,  date:'2024-06-27', invoice:'FC182583', destination:'60112 Troissereux (FR)',      zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'48.27',   chargedClient:'', notes:'1 colis' },
  { id: 67,  date:'2024-06-27', invoice:'FC182583', destination:'63000 Clermont-Ferrand (FR)', zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'57.72',   chargedClient:'', notes:'1 colis' },
  { id: 68,  date:'2024-06-27', invoice:'FC182583', destination:'72221 Haiterbach (DE)',       zoneId:'eu_proche',  ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'84.69',   chargedClient:'', notes:'1 colis' },
  { id: 69,  date:'2024-06-27', invoice:'FC182583', destination:'2300 Turnhout (BE)',          zoneId:'belgique',   ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'78.31',   chargedClient:'', notes:'1 colis' },
  { id: 70,  date:'2024-06-27', invoice:'FC182583', destination:'64739 Hochst (DE)',           zoneId:'eu_proche',  ringType:'DTS 230×660', qty:'2',  palettes:'0', colis:'1', costJeepest:'64.92',   chargedClient:'', notes:'2 DTS66' },
  { id: 71,  date:'2024-06-27', invoice:'FC182583', destination:'1130 Bruxelles (BE)',         zoneId:'belgique',   ringType:'DTS 200×600', qty:'1',  palettes:'0', colis:'1', costJeepest:'39.31',   chargedClient:'', notes:'1 DTS60' },
  { id: 72,  date:'2024-06-27', invoice:'FC182583', destination:'85200 Fontenay le Comte (FR)',zoneId:'france',     ringType:'DTS 200×600', qty:'4',  palettes:'0', colis:'2', costJeepest:'81.38',   chargedClient:'', notes:'2 colis' },
  { id: 73,  date:'2024-06-27', invoice:'FC182583', destination:'63720 Chavaroux (FR)',        zoneId:'france',     ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'58.11',   chargedClient:'', notes:'2 DTS56' },
  { id: 74,  date:'2024-06-27', invoice:'FC182583', destination:'18000 Bourges (FR)',          zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'46.95',   chargedClient:'', notes:'1 colis' },
  { id: 75,  date:'2024-06-27', invoice:'FC182583', destination:'72221 Haiterbach (DE)',       zoneId:'eu_proche',  ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'84.69',   chargedClient:'', notes:'1 colis' },
  { id: 76,  date:'2024-12-04', invoice:'FC174219', destination:'10059 Susa (Italie)',         zoneId:'eu_proche',  ringType:'DTS 180×560', qty:'10', palettes:'1', colis:'0', costJeepest:'127.11',  chargedClient:'', notes:'1 palette' },
  { id: 77,  date:'2023-12-04', invoice:'FC174219', destination:'79260 La Creche (FR)',        zoneId:'france',     ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'47.62',   chargedClient:'', notes:'2 DTS56' },
  { id: 78,  date:'2023-12-04', invoice:'FC174219', destination:'78390 Bois d\'Arcy (FR)',    zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'50.56',   chargedClient:'', notes:'1 colis' },
  { id: 79,  date:'2023-12-04', invoice:'FC174219', destination:'32200 Gimont (FR)',           zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'53.09',   chargedClient:'', notes:'1 colis' },
  { id: 80,  date:'2023-12-04', invoice:'FC174219', destination:'9300 Aalst (BE)',             zoneId:'belgique',   ringType:'DTS 230×660', qty:'2',  palettes:'0', colis:'1', costJeepest:'91.84',   chargedClient:'', notes:'2 DTS66' },
  { id: 81,  date:'2023-12-04', invoice:'FC174219', destination:'13585 Berlin (DE)',           zoneId:'eu_proche',  ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'131.15',  chargedClient:'', notes:'2 DTS56' },
  { id: 82,  date:'2023-12-04', invoice:'FC174219', destination:'1052 Le Mont s/Lausanne (CH)',zoneId:'eu_proche',  ringType:'DTS 200×600', qty:'6',  palettes:'0', colis:'3', costJeepest:'181.62',  chargedClient:'', notes:'3 colis 6 DTS60' },
  { id: 83,  date:'2023-12-04', invoice:'FC174219', destination:'69720 Saint Laurent (FR)',    zoneId:'france',     ringType:'DTS 200×600', qty:'10', palettes:'1', colis:'0', costJeepest:'78.07',   chargedClient:'', notes:'1 palette' },
  { id: 84,  date:'2023-12-04', invoice:'FC174219', destination:'90340 Chevremont (FR)',       zoneId:'france',     ringType:'DTS 180×560', qty:'16', palettes:'1', colis:'0', costJeepest:'98.06',   chargedClient:'', notes:'10 DTS56+6 DTS60' },
  { id: 85,  date:'2023-09-01', invoice:'FC171024', destination:'13585 Berlin (DE)',           zoneId:'eu_proche',  ringType:'DTS 180×560', qty:'6',  palettes:'0', colis:'2', costJeepest:'393.73',  chargedClient:'', notes:'tarif urgent' },
  { id: 86,  date:'2023-09-01', invoice:'FC171024', destination:'27950 Saint Marcel (FR)',     zoneId:'france',     ringType:'DTS 200×600', qty:'16', palettes:'1', colis:'0', costJeepest:'97.21',   chargedClient:'', notes:'1 palette' },
  { id: 87,  date:'2023-09-01', invoice:'FC171024', destination:'88100 Saint Die (FR)',        zoneId:'france',     ringType:'DTS 200×600', qty:'4',  palettes:'0', colis:'2', costJeepest:'56.72',   chargedClient:'', notes:'2 colis' },
  { id: 88,  date:'2023-09-01', invoice:'FC171024', destination:'91460 Marcoussis (FR)',       zoneId:'france',     ringType:'DTS 200×600', qty:'10', palettes:'1', colis:'0', costJeepest:'114.74',  chargedClient:'', notes:'1 palette' },
  { id: 89,  date:'2023-09-01', invoice:'FC171024', destination:'69720 Saint Laurent (FR)',    zoneId:'france',     ringType:'DTS 200×600', qty:'8',  palettes:'1', colis:'0', costJeepest:'86.58',   chargedClient:'', notes:'1 palette' },
  { id: 90,  date:'2023-09-01', invoice:'FC171024', destination:'1020 Laeken (BE)',            zoneId:'belgique',   ringType:'DTS 200×600', qty:'4',  palettes:'0', colis:'2', costJeepest:'94.61',   chargedClient:'', notes:'2 colis' },
  { id: 91,  date:'2023-06-01', invoice:'FC167951', destination:'85200 Fontenay le Comte (FR)',zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'45.84',   chargedClient:'', notes:'1 colis' },
  { id: 92,  date:'2023-06-01', invoice:'FC167951', destination:'69720 Saint Laurent (FR)',    zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'43.69',   chargedClient:'', notes:'1 colis' },
  { id: 93,  date:'2023-06-01', invoice:'FC167951', destination:'87920 Condat/Vienne (FR)',    zoneId:'france',     ringType:'DTS 230×660', qty:'2',  palettes:'0', colis:'1', costJeepest:'43.76',   chargedClient:'', notes:'2 DTS66' },
  { id: 94,  date:'2023-06-01', invoice:'FC167951', destination:'28700 Auneau (FR)',           zoneId:'france',     ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'44.62',   chargedClient:'', notes:'2 DTS56' },
  { id: 95,  date:'2023-06-01', invoice:'FC167951', destination:'21600 Ourges (FR)',           zoneId:'france',     ringType:'DTS 180×560', qty:'2',  palettes:'0', colis:'1', costJeepest:'47.96',   chargedClient:'', notes:'2 DTS56' },
  { id: 96,  date:'2023-06-01', invoice:'FC167951', destination:'72766 Reutlingen (DE)',       zoneId:'eu_proche',  ringType:'DTS 230×660', qty:'2',  palettes:'0', colis:'1', costJeepest:'71.79',   chargedClient:'', notes:'2 DTS66' },
  { id: 97,  date:'2023-02-28', invoice:'FC164110', destination:'90340 Chevremont (FR)',       zoneId:'france',     ringType:'DTS 180×560', qty:'12', palettes:'1', colis:'0', costJeepest:'91.72',   chargedClient:'', notes:'palette mixte' },
  { id: 98,  date:'2023-02-28', invoice:'FC164110', destination:'42160 Andrezieux (FR)',       zoneId:'france',     ringType:'DTS 200×600', qty:'4',  palettes:'0', colis:'2', costJeepest:'62.83',   chargedClient:'', notes:'2 colis' },
  { id: 99,  date:'2023-02-28', invoice:'FC164110', destination:'2440 Geel (BE)',              zoneId:'belgique',   ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'73.72',   chargedClient:'', notes:'1 colis' },
  { id: 100, date:'2023-02-28', invoice:'FC164110', destination:'78013 Versailles (FR)',       zoneId:'france',     ringType:'DTS 200×600', qty:'2',  palettes:'0', colis:'1', costJeepest:'57.09',   chargedClient:'', notes:'1 colis' },
  { id: 101, date:'2022-02-01', invoice:'FC151203', destination:'1020 Laeken (BE)',            zoneId:'belgique',   ringType:'DTS 200×600', qty:'4',  palettes:'0', colis:'2', costJeepest:'98.61',   chargedClient:'', notes:'2 colis' },
  { id: 102, date:'2022-02-01', invoice:'FC151203', destination:'63500 Issoire (FR)',          zoneId:'france',     ringType:'DTS 200×600', qty:'4',  palettes:'0', colis:'2', costJeepest:'53.62',   chargedClient:'', notes:'2 colis' },
  { id: 103, date:'2021-03-31', invoice:'FC141073', destination:'87920 Condat/Vienne (FR)',    zoneId:'france',     ringType:'DTS 230×660', qty:'2',  palettes:'0', colis:'1', costJeepest:'49.94',   chargedClient:'', notes:'2 DTS66' },
  { id: 104, date:'2021-02-09', invoice:'FC139285', destination:'60300 Norrkoping (Suède)',    zoneId:'eu_loin',    ringType:'DTS 200×600', qty:'50', palettes:'5', colis:'0', costJeepest:'1186.78', chargedClient:'', notes:'5 palettes' },
];

// ── STORAGE ───────────────────────────────────────────────────────────────────

function loadLS(key, def) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v !== null ? v : def; }
  catch { return def; }
}
function saveLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ── FORMULAIRE AJOUT FACTURE (toujours visible) ───────────────────────────────

function QuickAddInvoice({ zones, onSave }) {
  const empty = {
    date: new Date().toISOString().split('T')[0],
    invoice: '', destination: '', zoneId: '',
    ringType: 'DTS 200×600', qty: '', palettes: '0', colis: '1',
    costJeepest: '', chargedClient: '', notes: '',
  };
  const [form, setForm] = useState(empty);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-detect zone from destination as user types
  const handleDestChange = (v) => {
    set('destination', v);
    const { zoneId } = parseDestination(v);
    if (zoneId) setForm(f => ({ ...f, destination: v, zoneId }));
  };

  const handleSave = () => {
    if (!form.destination || !form.costJeepest) return;
    onSave({ ...form, id: Date.now() });
    setForm({ ...empty, date: form.date, invoice: form.invoice });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inp = (extra = {}) => ({
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${THEME.border}`,
    borderRadius: 7, padding: '8px 10px', color: THEME.text.primary,
    fontSize: 12, fontFamily: 'inherit', outline: 'none',
    width: '100%', boxSizing: 'border-box', ...extra,
  });

  const diff = form.chargedClient && form.costJeepest
    ? parseFloat(form.chargedClient) - parseFloat(form.costJeepest) : null;

  return (
    <div style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 14, overflow: 'hidden', height: '100%' }}>
      <div style={{ padding: '13px 18px', borderBottom: `1px solid ${THEME.border}`, background: `${THEME.accent.green}08`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Enregistrer une facture</div>
          <div style={{ fontSize: 10, color: THEME.text.muted, marginTop: 1 }}>Ajoute chaque facture JEEPEST reçue</div>
        </div>
        {saved && <span style={{ fontSize: 11, color: THEME.accent.green, fontWeight: 700 }}>Enregistré ✓</span>}
      </div>
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</div>
            <input type="date" style={inp()} value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>N° facture</div>
            <input style={inp()} placeholder="FC207899" value={form.invoice} onChange={e => set('invoice', e.target.value)} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Destination (code postal + ville)</div>
          <input style={inp()} placeholder="69720 Saint-Laurent-de-Mure (FR)" value={form.destination} onChange={e => handleDestChange(e.target.value)} />
          {form.zoneId && (
            <div style={{ marginTop: 4, fontSize: 10, color: THEME.accent.orange }}>
              Zone détectée : {zones.find(z => z.id === form.zoneId)?.name ?? form.zoneId}
            </div>
          )}
          {!form.zoneId && form.destination.length > 3 && (
            <select style={{ ...inp(), marginTop: 4 }} value={form.zoneId} onChange={e => set('zoneId', e.target.value)}>
              <option value="">Sélectionner la zone…</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type d'anneau</div>
            <select style={inp()} value={form.ringType} onChange={e => set('ringType', e.target.value)}>
              {RING_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quantité</div>
            <input type="number" style={inp()} placeholder="10" min="1" value={form.qty} onChange={e => set('qty', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Coût JEEPEST HT (€)</div>
            <input type="number" style={inp()} placeholder="107.00" value={form.costJeepest} onChange={e => set('costJeepest', e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Facturé client (€)</div>
            <input type="number" style={inp()} placeholder="Optionnel" value={form.chargedClient} onChange={e => set('chargedClient', e.target.value)} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</div>
          <input style={inp()} placeholder="1 palette 10 DTS60…" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        {diff !== null && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: diff >= 0 ? `${THEME.accent.green}12` : `${THEME.accent.red}12`, border: `1px solid ${diff >= 0 ? THEME.accent.green : THEME.accent.red}30` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: diff >= 0 ? THEME.accent.green : THEME.accent.red }}>
              {diff >= 0 ? `+${diff.toFixed(2)} €` : `${diff.toFixed(2)} €`} sur ce port
            </span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!form.destination || !form.costJeepest}
          style={{
            padding: '10px', borderRadius: 9, border: 'none', cursor: form.destination && form.costJeepest ? 'pointer' : 'not-allowed',
            background: form.destination && form.costJeepest ? THEME.accent.green : 'rgba(255,255,255,0.05)',
            color: form.destination && form.costJeepest ? '#fff' : THEME.text.muted,
            fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 13, letterSpacing: '0.04em',
            transition: 'all 0.15s',
          }}
        >
          Enregistrer la facture
        </button>
      </div>
    </div>
  );
}

// ── MODAL TARIFS ──────────────────────────────────────────────────────────────

function EditRatesModal({ zones, config, onSave, onClose }) {
  const [lz, setLz] = useState(JSON.parse(JSON.stringify(zones)));
  const [lc, setLc] = useState(JSON.parse(JSON.stringify(config)));
  const upZ = (id, f, v) => setLz(z => z.map(zone => zone.id === id ? { ...zone, [f]: v } : zone));
  const inp = { background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 6, padding: '6px 10px', color: THEME.text.primary, fontSize: 12, fontFamily: 'inherit', width: '90px', textAlign: 'right' };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: THEME.bg.modal, borderRadius: 16, border: `1px solid ${THEME.border}`, padding: 28, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Tarifs de référence</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: THEME.text.muted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 14 }}>Ces tarifs sont utilisés comme fallback quand on n'a pas d'historique pour une zone donnée.</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead><tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
            {['Zone','Palette (€)','Colis (€)','Délai'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 10, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', padding: '6px 8px', letterSpacing: '0.06em' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {lz.map(z => (
              <tr key={z.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <td style={{ padding: '7px 8px', fontSize: 12, color: THEME.text.primary }}>{z.name}</td>
                <td style={{ padding: '7px 8px' }}><input type="number" style={inp} value={z.ratePalette} onChange={e => upZ(z.id, 'ratePalette', parseFloat(e.target.value) || 0)} /></td>
                <td style={{ padding: '7px 8px' }}><input type="number" style={inp} value={z.rateColis} onChange={e => upZ(z.id, 'rateColis', parseFloat(e.target.value) || 0)} /></td>
                <td style={{ padding: '7px 8px' }}><input style={{ ...inp, width: '100px', textAlign: 'left' }} value={z.delay} onChange={e => upZ(z.id, 'delay', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[['emballagePalette','Emballage palette'],['manutentionPalette','Manutention'],['emballageColis','Emballage colis']].map(([k, label]) => (
            <div key={k}><div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label} (€)</div>
              <input type="number" style={{ ...inp, width: '100%', textAlign: 'left' }} value={lc[k]} onChange={e => setLc(c => ({ ...c, [k]: parseFloat(e.target.value) || 0 }))} /></div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={() => { onSave(lz, lc); onClose(); }}>Enregistrer</Btn>
        </div>
      </div>
    </div>
  );
}

// ── PAGE PRINCIPALE ───────────────────────────────────────────────────────────

export function ExpeditionModule() {
  const { isMobile } = useAppContext();
  const [zones, setZones] = useState(() => loadLS('expedition_zones', DEFAULT_ZONES));
  const [config, setConfig] = useState(() => loadLS('expedition_config', DEFAULT_CONFIG));
  const [history, setHistory] = useState(() => loadLS('expedition_history', INITIAL_HISTORY));
  const [showEditRates, setShowEditRates] = useState(false);
  const [filterZone, setFilterZone] = useState('all');

  // ── Calculateur ──────────────────────────────────────────────────────────────
  const [destInput, setDestInput] = useState('');
  const [calcRing, setCalcRing] = useState('DTS 200×600');
  const [calcQty, setCalcQty] = useState('');
  const [calcMode, setCalcMode] = useState('auto');
  const [manualZone, setManualZone] = useState('');

  const destInfo = useMemo(() => parseDestination(destInput), [destInput]);
  const activeZoneId = destInfo.zoneId || manualZone;

  // Records du même département (France) ou même zone
  const areaHistory = useMemo(() => {
    if (!activeZoneId) return [];
    return history.filter(h => {
      const cost = parseFloat(h.costJeepest);
      if (isNaN(cost) || cost < 20) return false;
      // Same department for France
      if (destInfo.deptCode) {
        const hp = extractPostal(h.destination);
        if (hp?.length === 5) return hp.startsWith(destInfo.deptCode);
      }
      // Otherwise same zone
      return h.zoneId === activeZoneId;
    });
  }, [destInfo, activeZoneId, history]);

  const areaStats = useMemo(() => {
    if (!areaHistory.length) return null;
    const colisRec = areaHistory.filter(h => h.colis > '0' || h.palettes === '0');
    const palRec   = areaHistory.filter(h => h.palettes > '0');
    const colCosts = colisRec.map(h => parseFloat(h.costJeepest));
    const palCosts = palRec.map(h => parseFloat(h.costJeepest));
    return {
      total: areaHistory.length,
      colis: colCosts.length ? { avg: avg(colCosts), min: Math.min(...colCosts), max: Math.max(...colCosts), n: colCosts.length } : null,
      palette: palCosts.length ? { avg: avg(palCosts), min: Math.min(...palCosts), max: Math.max(...palCosts), n: palCosts.length } : null,
      recent: areaHistory.slice(-5).reverse(),
    };
  }, [areaHistory]);

  const estimate = useMemo(() => {
    const qty = parseInt(calcQty);
    if (!qty || qty <= 0 || !activeZoneId) return null;

    const zone = zones.find(z => z.id === activeZoneId);
    const rpp = config.ringsPerPalette[calcRing] || 8;
    const isPalette = calcMode === 'auto' ? qty >= 5 : calcMode === 'palette';

    if (isPalette) {
      const palettes = Math.ceil(qty / rpp);
      // Use area history if available, otherwise zone rate
      const palCosts = areaHistory.filter(h => h.palettes > '0').map(h => parseFloat(h.costJeepest)).filter(c => !isNaN(c) && c > 20);
      const transportPerPalette = palCosts.length
        ? avg(palCosts) // avg per palette shipment from area
        : (zone?.ratePalette ?? 150);
      const transport = palettes === 1 ? transportPerPalette : palettes * (zone?.ratePalette ?? 150);
      const emballage = palettes * config.emballagePalette;
      const manutention = palettes * config.manutentionPalette;
      const total = transport + emballage + manutention;
      const source = palCosts.length ? `moy. historique (${palCosts.length} palette${palCosts.length > 1 ? 's' : ''})` : `tarif zone`;
      return { mode: 'palette', palettes, transport, emballage, manutention, total, perRing: total / qty, source };
    } else {
      const colCosts = areaHistory.filter(h => h.colis > '0' || h.palettes === '0').map(h => parseFloat(h.costJeepest)).filter(c => !isNaN(c) && c > 15);
      const transport = colCosts.length ? avg(colCosts) : (zone?.rateColis ?? 52);
      const emballage = config.emballageColis;
      const total = transport + emballage;
      const source = colCosts.length ? `moy. historique (${colCosts.length} colis)` : `tarif zone`;
      return { mode: 'colis', transport, emballage, total, perRing: total / qty, source };
    }
  }, [calcQty, calcMode, calcRing, activeZoneId, areaHistory, zones, config]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const saveShipment = (s) => {
    const updated = [s, ...history];
    setHistory(updated);
    saveLS('expedition_history', updated);
  };
  const deleteShipment = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    saveLS('expedition_history', updated);
  };
  const saveRates = (nz, nc) => {
    setZones(nz); setConfig(nc);
    saveLS('expedition_zones', nz); saveLS('expedition_config', nc);
  };

  const filteredHistory = useMemo(() =>
    filterZone === 'all' ? history : history.filter(h => h.zoneId === filterZone),
    [history, filterZone]
  );

  // Stats globales
  const globalStats = useMemo(() => {
    const valid = history.filter(h => parseFloat(h.costJeepest) > 15);
    const withBoth = valid.filter(h => h.chargedClient && parseFloat(h.chargedClient) > 0);
    const marge = withBoth.reduce((s, h) => s + parseFloat(h.chargedClient) - parseFloat(h.costJeepest), 0);
    const fr = valid.filter(h => h.zoneId === 'france');
    const be = valid.filter(h => h.zoneId === 'belgique');
    return {
      count: history.length,
      avgFrance:   fr.length ? avg(fr.map(h => parseFloat(h.costJeepest))) : 0,
      avgBelgique: be.length ? avg(be.map(h => parseFloat(h.costJeepest))) : 0,
      totalMarge: marge, hasClientData: withBoth.length,
    };
  }, [history]);

  const inp = { background: 'rgba(255,255,255,0.04)', border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '9px 12px', color: THEME.text.primary, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' };

  const confidenceDot = (n) => {
    const color = n === 0 ? THEME.text.muted : n <= 2 ? THEME.accent.yellow : THEME.accent.green;
    const label = n === 0 ? 'Pas de données' : n <= 2 ? `${n} expéd.` : `${n} expéd.`;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <span style={{ fontSize: 10, color, fontWeight: 700 }}>{label}</span>
      </span>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <TopBar title="Expédition" subtitle="Tarification JEEPEST — basé sur 33 factures réelles" />
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px' : '22px 28px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
          {[
            { label: 'Expéditions référencées', value: globalStats.count, color: THEME.accent.orange },
            { label: 'Moy. France (toutes)',     value: globalStats.avgFrance > 0 ? `${globalStats.avgFrance.toFixed(0)} €` : '—', color: THEME.accent.blue },
            { label: 'Moy. Belgique (toutes)',   value: globalStats.avgBelgique > 0 ? `${globalStats.avgBelgique.toFixed(0)} €` : '—', color: THEME.accent.purple },
            { label: 'Marge facturée client',    value: globalStats.hasClientData > 0 ? `${globalStats.totalMarge >= 0 ? '+' : ''}${globalStats.totalMarge.toFixed(0)} €` : 'Non renseigné', color: globalStats.totalMarge >= 0 ? THEME.accent.green : THEME.accent.red },
          ].map(s => (
            <div key={s.label} style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: 'Rajdhani, sans-serif' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Calculateur + Ajout facture */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: 18, marginBottom: 22 }}>

          {/* ── Calculateur ── */}
          <div style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '13px 18px', borderBottom: `1px solid ${THEME.border}`, background: `${THEME.accent.orange}09` }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Calculateur précis</div>
              <div style={{ fontSize: 10, color: THEME.text.muted, marginTop: 1 }}>Entrez le code postal → estimation basée sur l'historique réel</div>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Destination */}
              <div>
                <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Destination — code postal + ville</div>
                <input
                  style={{ ...inp, fontSize: 14 }}
                  placeholder="ex: 63500 Issoire (FR) · 1020 Laeken (BE) · Dubai"
                  value={destInput}
                  onChange={e => { setDestInput(e.target.value); setManualZone(''); }}
                />
                {/* Info détectée */}
                <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {destInfo.label && (
                    <span style={{ fontSize: 11, color: THEME.accent.orange, fontWeight: 700, background: `${THEME.accent.orange}14`, padding: '3px 8px', borderRadius: 5 }}>{destInfo.label}</span>
                  )}
                  {destInfo.zoneId && (
                    <span style={{ fontSize: 11, color: THEME.text.muted }}>Zone : {zones.find(z => z.id === destInfo.zoneId)?.name}</span>
                  )}
                  {areaStats && confidenceDot(areaStats.total)}
                </div>
                {/* Sélection manuelle si non détecté */}
                {!destInfo.zoneId && destInput.length > 2 && (
                  <select style={{ ...inp, marginTop: 8, fontSize: 12 }} value={manualZone} onChange={e => setManualZone(e.target.value)}>
                    <option value="">Sélectionner la zone manuellement…</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                )}
              </div>

              {/* Stats historique pour cette zone */}
              {areaStats && (
                <div style={{ borderRadius: 10, border: `1px solid ${THEME.accent.orange}22`, background: `${THEME.accent.orange}07`, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: THEME.accent.orange, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Historique réel · {destInfo.deptCode ? `Dept. ${destInfo.deptCode} — ${DEPT[destInfo.deptCode] ?? ''}` : zones.find(z => z.id === activeZoneId)?.name}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    {areaStats.colis && (
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Colis ({areaStats.colis.n} expéd.)</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: THEME.accent.green, fontFamily: 'Rajdhani, sans-serif' }}>{areaStats.colis.avg.toFixed(0)} €</div>
                        <div style={{ fontSize: 10, color: THEME.text.muted }}>min {areaStats.colis.min.toFixed(0)} € · max {areaStats.colis.max.toFixed(0)} €</div>
                      </div>
                    )}
                    {areaStats.palette && (
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Palette ({areaStats.palette.n} expéd.)</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: THEME.accent.blue, fontFamily: 'Rajdhani, sans-serif' }}>{areaStats.palette.avg.toFixed(0)} €</div>
                        <div style={{ fontSize: 10, color: THEME.text.muted }}>min {areaStats.palette.min.toFixed(0)} € · max {areaStats.palette.max.toFixed(0)} €</div>
                      </div>
                    )}
                  </div>
                  {/* 3 dernières livraisons dans cette zone */}
                  {areaStats.recent.length > 0 && (
                    <div>
                      <div style={{ fontSize: 9, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Dernières expéditions</div>
                      {areaStats.recent.map(h => (
                        <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid rgba(255,255,255,0.04)`, fontSize: 11 }}>
                          <span style={{ color: THEME.text.secondary }}>{h.date} · {h.destination}</span>
                          <span style={{ color: THEME.text.primary, fontWeight: 700 }}>{parseFloat(h.costJeepest).toFixed(2)} €</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!areaStats && activeZoneId && (
                <div style={{ padding: '10px 14px', borderRadius: 9, background: `${THEME.accent.yellow}0D`, border: `1px solid ${THEME.accent.yellow}28`, fontSize: 11, color: THEME.accent.yellow }}>
                  Pas encore d'expédition dans cette zone — estimation basée sur le tarif de référence.
                </div>
              )}

              {/* Type + Quantité */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type d'anneau</div>
                  <select style={inp} value={calcRing} onChange={e => setCalcRing(e.target.value)}>
                    {RING_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quantité</div>
                  <input type="number" style={inp} placeholder="4" min="1" value={calcQty} onChange={e => setCalcQty(e.target.value)} />
                </div>
              </div>

              {/* Mode */}
              <div>
                <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mode</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[['auto','Auto (≥5 = palette)'],['colis','Colis'],['palette','Palette']].map(([val, label]) => (
                    <button key={val} onClick={() => setCalcMode(val)} style={{
                      flex: 1, padding: '8px 4px', borderRadius: 7, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                      background: calcMode === val ? THEME.accent.orange : 'rgba(255,255,255,0.05)',
                      color: calcMode === val ? '#fff' : THEME.text.secondary,
                    }}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Résultat */}
              {estimate ? (
                <div style={{ borderRadius: 12, border: `2px solid ${THEME.accent.green}44`, background: `${THEME.accent.green}0A`, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: THEME.accent.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                    Estimation · {estimate.mode === 'palette' ? `${estimate.palettes} palette${estimate.palettes > 1 ? 's' : ''}` : 'Colis'} · {estimate.source}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: THEME.text.secondary }}>
                      <span>Transport</span><span>{estimate.transport.toFixed(2)} €</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: THEME.text.secondary }}>
                      <span>Emballage</span><span>{estimate.emballage.toFixed(2)} €</span>
                    </div>
                    {estimate.manutention > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: THEME.text.secondary }}>
                        <span>Manutention</span><span>{estimate.manutention.toFixed(2)} €</span>
                      </div>
                    )}
                  </div>
                  <div style={{ borderTop: `1px solid ${THEME.accent.green}30`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div>
                      <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 2 }}>Prix à facturer au client</div>
                      <div style={{ fontSize: 10, color: THEME.text.muted }}>{estimate.perRing.toFixed(2)} € / anneau · {zones.find(z => z.id === activeZoneId)?.delay}</div>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: THEME.accent.green, fontFamily: 'Rajdhani, sans-serif' }}>{estimate.total.toFixed(2)} €</div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${THEME.border}`, textAlign: 'center', color: THEME.text.muted, fontSize: 12 }}>
                  Entrez une destination et une quantité
                </div>
              )}
            </div>
          </div>

          {/* ── Ajout facture ── */}
          <QuickAddInvoice zones={zones} onSave={saveShipment} />
        </div>

        {/* ── Historique ── */}
        <div style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Historique — {filteredHistory.length} expéditions</div>
              <div style={{ fontSize: 10, color: THEME.text.muted, marginTop: 1 }}>Données JEEPEST 2021-2026</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select style={{ background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 7, padding: '6px 10px', color: THEME.text.secondary, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}
                value={filterZone} onChange={e => setFilterZone(e.target.value)}>
                <option value="all">Toutes les zones</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <Btn size="sm" variant="secondary" onClick={() => setShowEditRates(true)}>Tarifs de référence</Btn>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead><tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                {['Date','Facture','Destination','Anneau','Qté','Coût JEEPEST','Facturé','Écart','Notes',''].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', padding: '9px 12px', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredHistory.map((h, i) => {
                  const diff = h.chargedClient && parseFloat(h.chargedClient) > 0 && h.costJeepest
                    ? parseFloat(h.chargedClient) - parseFloat(h.costJeepest) : null;
                  return (
                    <tr key={h.id} style={{ borderBottom: i < filteredHistory.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: THEME.text.muted, whiteSpace: 'nowrap' }}>{h.date}</td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: THEME.accent.orange, fontWeight: 600 }}>{h.invoice || '—'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: THEME.text.primary, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.destination}>{h.destination || '—'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: THEME.text.muted, whiteSpace: 'nowrap' }}>{h.ringType?.replace('DTS ', '')}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: THEME.text.primary, fontWeight: 700, textAlign: 'center' }}>{h.qty || '—'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: THEME.text.primary, fontWeight: 600, whiteSpace: 'nowrap' }}>{h.costJeepest ? `${parseFloat(h.costJeepest).toFixed(2)} €` : '—'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: THEME.text.secondary, whiteSpace: 'nowrap' }}>
                        {h.chargedClient && parseFloat(h.chargedClient) > 0 ? `${parseFloat(h.chargedClient).toFixed(2)} €` : <span style={{ color: THEME.text.muted, fontStyle: 'italic' }}>—</span>}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {diff !== null ? <span style={{ color: diff >= 0 ? THEME.accent.green : THEME.accent.red }}>{diff >= 0 ? '+' : ''}{diff.toFixed(2)} €</span> : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: THEME.text.muted, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.notes}>{h.notes || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <button onClick={() => deleteShipment(h.id)} style={{ background: 'none', border: 'none', color: THEME.text.muted, cursor: 'pointer', fontSize: 15, padding: '0 4px', lineHeight: 1 }}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showEditRates && <EditRatesModal zones={zones} config={config} onSave={saveRates} onClose={() => setShowEditRates(false)} />}
    </div>
  );
}
