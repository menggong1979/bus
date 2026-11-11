import { BusStop } from '../types.ts';

export const SINGAPORE_BUS_STOPS: BusStop[] = [
  {
    code: '83139',
    roadName: 'Marine Parade Rd',
    description: 'Opp Parkway Parade',
    latitude: 1.30155,
    longitude: 103.90538,
    services: ['15', '31', '36', '43', '48', '135', '196', '197', '966']
  },
  {
    code: '83131',
    roadName: 'Marine Parade Rd',
    description: 'Parkway Parade',
    latitude: 1.30089,
    longitude: 103.90485,
    services: ['15', '31', '36', '43', '48', '135', '196', '197', '966']
  },
  {
    code: '01012',
    roadName: 'Bras Basah Rd',
    description: 'Hotel Rendezvous',
    latitude: 1.29892,
    longitude: 103.85023,
    services: ['7', '14', '16', '36', '77', '106', '111', '128', '162', '167', '171', '174', '175', '190', '502', '518']
  },
  {
    code: '03211',
    roadName: 'Orchard Rd',
    description: 'Opp Somerset Stn',
    latitude: 1.30058,
    longitude: 103.83852,
    services: ['7', '14', '16', '65', '106', '111', '123', '175', '502']
  },
  {
    code: '09048',
    roadName: 'Orchard Blvd',
    description: 'Orchard Stn Exit 13',
    latitude: 1.30401,
    longitude: 103.83204,
    services: ['7', '36', '77', '105', '106', '111', '123', '132', '174']
  },
  {
    code: '10169',
    roadName: 'Telok Blangah Rd',
    description: 'Opp VivoCity',
    latitude: 1.26528,
    longitude: 103.82194,
    services: ['10', '30', '57', '61', '65', '80', '97', '100', '131', '143', '145', '166', '855']
  },
  {
    code: '80059',
    roadName: 'Sims Ave',
    description: 'Kallang Stn',
    latitude: 1.31154,
    longitude: 103.87163,
    services: ['2', '7', '11', '12', '13', '21', '26', '31', '32', '33', '67', '140', '175']
  },
  {
    code: '64009',
    roadName: 'Tampines Ave 4',
    description: 'Tampines Int',
    latitude: 1.35338,
    longitude: 103.94528,
    services: ['3', '4', '8', '10', '19', '20', '23', '28', '29', '37', '38', '46', '65', '67', '68', '69', '72', '81', '291', '292', '293']
  },
  {
    code: '28009',
    roadName: 'Jurong Gateway Rd',
    description: 'Jurong East Int',
    latitude: 1.33318,
    longitude: 103.74235,
    services: ['41', '49', '51', '52', '66', '78', '79', '97', '98', '105', '143', '160', '183', '197', '333', '334', '335', '506']
  },
  {
    code: '46009',
    roadName: 'Woodlands Sq',
    description: 'Woodlands Temp Int',
    latitude: 1.43734,
    longitude: 103.78652,
    services: ['161', '168', '169', '178', '187', '856', '858', '900', '901', '903', '904', '911', '912', '913', '925', '960', '961', '962', '963', '964', '965', '966', '969']
  },
  {
    code: '17181',
    roadName: 'Clementi Ave 3',
    description: 'Clementi Stn Exit B',
    latitude: 1.31512,
    longitude: 103.76527,
    services: ['14', '52', '78', '96', '105', '106', '147', '154', '156', '165', '166', '175', '185', '189', '201', '285']
  },
  {
    code: '84029',
    roadName: 'Bedok North Ave 1',
    description: 'Bedok Stn Exit B',
    latitude: 1.32415,
    longitude: 103.92985,
    services: ['7', '9', '14', '16', '17', '18', '24', '25', '26', '28', '30', '31', '32', '33', '35', '38', '40', '60', '66', '69', '87', '168', '196', '197', '222', '225', '228', '229']
  }
];

export function findBusStop(codeOrSearch: string): BusStop | undefined {
  const q = codeOrSearch.trim().toLowerCase();
  if (!q) return undefined;
  
  // Try exact code match
  const byCode = SINGAPORE_BUS_STOPS.find(s => s.code.toLowerCase() === q);
  if (byCode) return byCode;

  // Search by description or road name
  return SINGAPORE_BUS_STOPS.find(s => 
    s.description.toLowerCase().includes(q) || 
    s.roadName.toLowerCase().includes(q) ||
    s.code.includes(q)
  );
}
