import { useProvinceContext } from './useProvinceContext';

/**
 * Custom hook to generate province-aware page titles
 * @param baseTitle - The base title of the page
 * @returns Province-aware page title
 */
export const useProvincePageTitle = (baseTitle: string): string => {
  const provinceContext = useProvinceContext();

  if (provinceContext.isProvincialAdmin && provinceContext.assignedProvince) {
    return `${baseTitle} - ${provinceContext.assignedProvince.name} Province`;
  }

  return baseTitle;
};
