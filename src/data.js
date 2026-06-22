export const TARGET_LICENSE_PLATE = '1131-766-1132'

export const H5_STATIONS = [
  { name: 'Batthyány tér', position: [47.50697, 19.03895] },
  { name: 'Margit híd, budai hídfő', position: [47.5151, 19.03955] },
  { name: 'Szépvölgyi út', position: [47.5273, 19.04017] },
  { name: 'Tímár utca', position: [47.53468, 19.0462] },
  { name: 'Szentlélek tér', position: [47.53965, 19.04715] },
  { name: 'Filatorigát', position: [47.5519, 19.04624] },
  { name: 'Kaszásdűlő', position: [47.55704, 19.04537] },
  { name: 'Aquincum', position: [47.5676, 19.0488] },
  { name: 'Rómaifürdő', position: [47.57545, 19.0491] },
  { name: 'Csillaghegy', position: [47.5851, 19.04515] },
  { name: 'Békásmegyer', position: [47.59809, 19.0546] },
  { name: 'Budakalász', position: [47.616, 19.0547] },
  { name: 'Budakalász, Lenfonó', position: [47.62715, 19.0466] },
  { name: 'Szentistvántelep', position: [47.6356, 19.043] },
  { name: 'Pomáz', position: [47.64275, 19.03266] },
  { name: 'Pannóniatelep', position: [47.66135, 19.0756] },
  { name: 'Szentendre', position: [47.6698, 19.0758] },
]

export const H5_ROUTE = H5_STATIONS.map(({ position }) => position)
