export interface StateRead {
  id: string;
  name: string;
  code?: string | null;
}

export interface CityRead {
  id: string;
  name: string;
  state_id?: string;
  state?: StateRead;
}

export interface UniversityRead {
  id: string;
  name: string;
  short_name?: string | null;
}

export interface CampusRead {
  id: string;
  name: string;
  short_name?: string | null;
  institution?: string;
  city_id?: string | null;
  university_id?: string | null;
  city?: CityRead | null;
}

export interface AreaRead {
  id: string;
  name: string;
  slug: string;
  city_id?: string;
  campus_id?: string | null;
  city?: CityRead;
  campus?: CampusRead | null;
}