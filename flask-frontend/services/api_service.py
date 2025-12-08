"""
API Service Layer
Handles communication with Node.js/Express backend API
"""

import requests
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class APIService:
    """Service class for backend API communication"""
    
    def __init__(self, base_url: str):
        """
        Initialize API service
        
        Args:
            base_url: Base URL of the backend API (e.g., http://localhost:5000/api/v1)
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        files: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make HTTP request to backend API
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (e.g., '/membership-applications')
            data: Request body data
            params: Query parameters
            files: Files to upload
            
        Returns:
            Response data as dictionary
            
        Raises:
            requests.exceptions.RequestException: If request fails
        """
        url = f"{self.base_url}{endpoint}"
        
        try:
            if files:
                # For file uploads, don't set Content-Type header
                headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                response = self.session.request(
                    method=method,
                    url=url,
                    data=data,
                    params=params,
                    files=files,
                    headers=headers,
                    timeout=30
                )
            else:
                response = self.session.request(
                    method=method,
                    url=url,
                    json=data,
                    params=params,
                    timeout=30
                )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {method} {url} - {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    return {
                        'success': False,
                        'message': error_data.get('message', str(e)),
                        'error': error_data.get('error', str(e))
                    }
                except:
                    pass
            raise
    
    # Membership Application endpoints
    
    def create_application(self, application_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new membership application
        
        Args:
            application_data: Application form data
            
        Returns:
            API response with application details
        """
        return self._make_request('POST', '/membership-applications', data=application_data)
    
    def get_application_by_id(self, application_id: int) -> Dict[str, Any]:
        """
        Get application by ID
        
        Args:
            application_id: Application ID
            
        Returns:
            API response with application details
        """
        return self._make_request('GET', f'/membership-applications/{application_id}')
    
    def get_application_by_number(self, application_number: str) -> Dict[str, Any]:
        """
        Get application by application number
        
        Args:
            application_number: Application number
            
        Returns:
            API response with application details
        """
        return self._make_request('GET', f'/membership-applications/number/{application_number}')
    
    def update_application(self, application_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an existing application
        
        Args:
            application_id: Application ID
            update_data: Data to update
            
        Returns:
            API response
        """
        return self._make_request('PUT', f'/membership-applications/{application_id}', data=update_data)
    
    # Lookup data endpoints
    
    def get_lookups(self, lookup_type: str) -> Dict[str, Any]:
        """
        Get lookup data (genders, languages, occupations, etc.)
        
        Args:
            lookup_type: Type of lookup data (e.g., 'genders', 'languages')
            
        Returns:
            API response with lookup data
        """
        return self._make_request('GET', f'/lookups/{lookup_type}')
    
    def get_all_lookups(self) -> Dict[str, Any]:
        """
        Get all lookup data at once

        Returns:
            API response with all lookup data
        """
        return self._make_request('GET', '/lookups')

    def get_genders(self) -> Dict[str, Any]:
        """Get all genders"""
        return self._make_request('GET', '/lookups/genders')

    def get_races(self) -> Dict[str, Any]:
        """Get all races"""
        return self._make_request('GET', '/lookups/races')

    def get_citizenships(self) -> Dict[str, Any]:
        """Get all citizenship types"""
        return self._make_request('GET', '/lookups/citizenships')

    def get_languages(self) -> Dict[str, Any]:
        """Get all languages"""
        return self._make_request('GET', '/lookups/languages')

    def get_occupations(self) -> Dict[str, Any]:
        """Get all occupations"""
        return self._make_request('GET', '/lookups/occupations')

    def get_occupation_categories(self) -> Dict[str, Any]:
        """Get all occupation categories"""
        return self._make_request('GET', '/lookups/occupation-categories')

    def get_qualifications(self) -> Dict[str, Any]:
        """Get all qualification levels"""
        return self._make_request('GET', '/lookups/qualification-levels')
    
    # Geographic data endpoints
    
    def get_geographic_data(self, geo_type: str, parent_code: Optional[str] = None) -> Dict[str, Any]:
        """
        Get geographic data (provinces, districts, municipalities, wards)
        
        Args:
            geo_type: Type of geographic data ('provinces', 'districts', 'municipalities', 'wards')
            parent_code: Parent code for filtering (e.g., province_code for districts)
            
        Returns:
            API response with geographic data
        """
        params = {'parent_code': parent_code} if parent_code else None
        return self._make_request('GET', f'/geographic/{geo_type}', params=params)
    
    def get_provinces(self) -> Dict[str, Any]:
        """Get all provinces"""
        return self._make_request('GET', '/geographic/provinces')
    
    def get_districts(self, province_code: Optional[str] = None) -> Dict[str, Any]:
        """Get districts, optionally filtered by province"""
        params = {'province_code': province_code} if province_code else None
        return self._make_request('GET', '/geographic/districts', params=params)
    
    def get_municipalities(self, district_code: Optional[str] = None) -> Dict[str, Any]:
        """Get municipalities, optionally filtered by district"""
        params = {'district_code': district_code} if district_code else None
        return self._make_request('GET', '/geographic/municipalities', params=params)
    
    def get_wards(self, municipal_code: Optional[str] = None) -> Dict[str, Any]:
        """Get wards, optionally filtered by municipality"""
        params = {'municipality_code': municipal_code} if municipal_code else None
        return self._make_request('GET', '/geographic/wards', params=params)
    
    def get_voting_districts(self, ward_code: Optional[str] = None) -> Dict[str, Any]:
        """Get voting districts, optionally filtered by ward"""
        params = {'ward_code': ward_code} if ward_code else None
        return self._make_request('GET', '/geographic/voting-districts', params=params)
    
    # Payment endpoints
    
    def process_card_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process card payment through Peach Payment Gateway
        
        Args:
            payment_data: Payment data including card details
            
        Returns:
            API response with payment result
        """
        return self._make_request('POST', '/payments/card-payment', data=payment_data)
    
    def process_cash_payment(
        self, 
        application_id: int, 
        amount: float, 
        receipt_number: str,
        receipt_file: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Process cash payment with receipt upload
        
        Args:
            application_id: Application ID
            amount: Payment amount
            receipt_number: Receipt number
            receipt_file: Receipt image file
            
        Returns:
            API response with payment result
        """
        data = {
            'applicationId': application_id,
            'amount': amount,
            'receiptNumber': receipt_number
        }
        
        files = None
        if receipt_file:
            files = {'receipt': receipt_file}
        
        return self._make_request('POST', '/payments/cash-payment', data=data, files=files)
    
    def get_payment_status(self, application_id: int) -> Dict[str, Any]:
        """
        Get payment status for an application
        
        Args:
            application_id: Application ID
            
        Returns:
            API response with payment status
        """
        return self._make_request('GET', f'/payments/application/{application_id}/payments')
    
    # IEC API endpoints (for address verification)
    
    def verify_voter(self, id_number: str) -> Dict[str, Any]:
        """
        Verify voter details using IEC API
        
        Args:
            id_number: South African ID number
            
        Returns:
            API response with voter details
        """
        return self._make_request('POST', '/iec/verify-voter', data={'idNumber': id_number})
    
    def validate_voting_district(self, voting_district_code: str) -> Dict[str, Any]:
        """
        Validate voting district code
        
        Args:
            voting_district_code: Voting district code
            
        Returns:
            API response with validation result
        """
        return self._make_request(
            'POST', 
            '/iec/validate-voting-district', 
            data={'votingDistrictCode': voting_district_code}
        )

