/**
 * Type declarations for @jayjaydluffy/phil-reg-prov-mun-brgy
 *
 * This package provides Philippine location data including regions, provinces,
 * cities/municipalities, and barangays.
 *
 * Note: The actual data structure uses "name" for all location names,
 * not specific properties like "mun_name" or "brgy_name".
 */

declare module '@jayjaydluffy/phil-reg-prov-mun-brgy' {
  interface PhilRegion {
    reg_code: string;
    name: string;
  }

  interface PhilProvince {
    prov_code: string;
    name: string;
    reg_code: string;
  }

  interface PhilCityMunicipality {
    mun_code: string;
    name: string;
    prov_code: string;
  }

  interface PhilBarangay {
    name: string;
    mun_code: string;
  }

  interface PhilData {
    regions: PhilRegion[];
    provinces: PhilProvince[];
    city_mun: PhilCityMunicipality[];
    barangays: PhilBarangay[];

    // Methods
    getProvincesByRegion(regionCode: string): PhilProvince[];
    getCityMunByProvince(provinceCode: string): PhilCityMunicipality[];
    getBarangayByMun(cityCode: string): PhilBarangay[];
  }

  const phil: PhilData;
  export default phil;
}
