import { executeQuery } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Lookup interfaces
export interface Gender {
  gender_id: number;
  gender_name: string;
  created_at: string;
}

export interface Race {
  race_id: number;
  race_name: string;
  created_at: string;
}

export interface Citizenship {
  citizenship_id: number;
  citizenship_name: string;
  created_at: string;
}

export interface Language {
  language_id: number;
  language_name: string;
  language_code?: string;
  created_at: string;
}

export interface OccupationCategory {
  category_id: number;
  category_name: string;
  created_at: string;
}

export interface Occupation {
  occupation_id: number;
  occupation_name: string;
  category_id?: number;
  category_name?: string;
  created_at: string;
}

export interface QualificationLevel {
  qualification_id: number;
  qualification_name: string;
  qualification_level: number;
  created_at: string;
}

export interface SubscriptionType {
  subscription_type_id: number;
  subscription_name: string;
  created_at: string;
}

export interface MembershipStatus {
  status_id: number;
  status_name: string;
  is_active: boolean;
  created_at: string;
}

export interface VotingStation {
  voting_station_id: number;
  station_code?: string;
  station_name: string;
  ward_code: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Lookup model class
export class LookupModel {
  // Gender lookups
  static async getAllGenders(): Promise<Gender[]> {
    try {
      const query = 'SELECT * FROM genders ORDER BY gender_name';
      return await executeQuery<Gender>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch genders', error);
    }
  }

  // Race lookups
  static async getAllRaces(): Promise<Race[]> {
    try {
      const query = 'SELECT * FROM races ORDER BY race_name';
      return await executeQuery<Race>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch races', error);
    }
  }

  // Citizenship lookups
  static async getAllCitizenships(): Promise<Citizenship[]> {
    try {
      const query = 'SELECT * FROM citizenships ORDER BY citizenship_name';
      return await executeQuery<Citizenship>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch citizenships', error);
    }
  }

  // Language lookups
  static async getAllLanguages(): Promise<Language[]> {
    try {
      const query = 'SELECT * FROM languages ORDER BY language_name';
      return await executeQuery<Language>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch languages', error);
    }
  }

  // Occupation category lookups
  static async getAllOccupationCategories(): Promise<OccupationCategory[]> {
    try {
      const query = 'SELECT * FROM occupation_categories ORDER BY category_name';
      return await executeQuery<OccupationCategory>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch occupation categories', error);
    }
  }

  // Occupation lookups
  static async getAllOccupations(): Promise<Occupation[]> {
    try {
      const query = `
        SELECT 
          o.occupation_id,
          o.occupation_name,
          o.category_id,
          oc.category_name,
          o.created_at
        FROM occupations o
        LEFT JOIN occupation_categories oc ON o.category_id = oc.category_id
        ORDER BY oc.category_name, o.occupation_name
      `;
      return await executeQuery<Occupation>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch occupations', error);
    }
  }

  // Get occupations by category
  static async getOccupationsByCategory(categoryId: number): Promise<Occupation[]> {
    try {
      const query = `
        SELECT 
          o.occupation_id,
          o.occupation_name,
          o.category_id,
          oc.category_name,
          o.created_at
        FROM occupations o
        LEFT JOIN occupation_categories oc ON o.category_id = oc.category_id
        WHERE o.category_id = ?
        ORDER BY o.occupation_name
      `;
      return await executeQuery<Occupation>(query, [categoryId]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch occupations by category', error);
    }
  }

  // Qualification level lookups
  static async getAllQualificationLevels(): Promise<QualificationLevel[]> {
    try {
      const query = 'SELECT * FROM qualification_levels ORDER BY qualification_level';
      return await executeQuery<QualificationLevel>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch qualification levels', error);
    }
  }

  // Subscription type lookups
  static async getAllSubscriptionTypes(): Promise<SubscriptionType[]> {
    try {
      const query = 'SELECT * FROM subscription_types ORDER BY subscription_name';
      return await executeQuery<SubscriptionType>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch subscription types', error);
    }
  }

  // Membership status lookups
  static async getAllMembershipStatuses(): Promise<MembershipStatus[]> {
    try {
      const query = 'SELECT * FROM membership_statuses ORDER BY status_name';
      return await executeQuery<MembershipStatus>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch membership statuses', error);
    }
  }

  // Get active membership statuses only
  static async getActiveMembershipStatuses(): Promise<MembershipStatus[]> {
    try {
      const query = 'SELECT * FROM membership_statuses WHERE is_active = TRUE ORDER BY status_name';
      return await executeQuery<MembershipStatus>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch active membership statuses', error);
    }
  }

  // Voting station lookups
  static async getAllVotingStations(): Promise<VotingStation[]> {
    try {
      const query = `
        SELECT * FROM voting_stations 
        WHERE is_active = TRUE 
        ORDER BY ward_code, station_name
      `;
      return await executeQuery<VotingStation>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch voting stations', error);
    }
  }

  // Get voting stations by ward
  static async getVotingStationsByWard(wardCode: string): Promise<VotingStation[]> {
    try {
      const query = `
        SELECT * FROM voting_stations 
        WHERE ward_code = ? AND is_active = TRUE 
        ORDER BY station_name
      `;
      return await executeQuery<VotingStation>(query, [wardCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch voting stations by ward', error);
    }
  }

  // Get all lookup data in one call
  static async getAllLookupData(): Promise<{
    genders: Gender[];
    races: Race[];
    citizenships: Citizenship[];
    languages: Language[];
    occupationCategories: OccupationCategory[];
    occupations: Occupation[];
    qualificationLevels: QualificationLevel[];
    subscriptionTypes: SubscriptionType[];
    membershipStatuses: MembershipStatus[];
  }> {
    try {
      const [
        genders,
        races,
        citizenships,
        languages,
        occupationCategories,
        occupations,
        qualificationLevels,
        subscriptionTypes,
        membershipStatuses
      ] = await Promise.all([
        this.getAllGenders(),
        this.getAllRaces(),
        this.getAllCitizenships(),
        this.getAllLanguages(),
        this.getAllOccupationCategories(),
        this.getAllOccupations(),
        this.getAllQualificationLevels(),
        this.getAllSubscriptionTypes(),
        this.getAllMembershipStatuses()
      ]);

      return {
        genders,
        races,
        citizenships,
        languages,
        occupationCategories,
        occupations,
        qualificationLevels,
        subscriptionTypes,
        membershipStatuses
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch all lookup data', error);
    }
  }
}
