# Frontend Documentation

## 1. Tech Stack
- **Framework**: Next.js
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Charting**: Chart.js or D3.js

## 2. Pages and Components
### Pages
1. **Home Page**: Welcome message and links to login/register.
2. **Login Page**: Email and password fields for user login.
3. **Membership Application Page**: Form for new members to register.
4. **Member Dashboard**: Displays profile, membership status, and voter registration status.
5. **Admin Dashboard**: Displays analytics and member management tools.
6. **Analytics Pages**:
   - **Overview**: Displays membership statistics with drill-down functionality.
   - **Top Wards**: Displays top 10 wards by membership count with growth metrics.
   - **Top Municipalities**: Displays top 10 municipalities by membership count with growth metrics.
   - **Top Regions**: Displays top 10 regions by membership count with growth metrics.
7. **Voter Verification Page**: Allows admins to verify voter registration status.
8. **Leadership Management Pages**:
   - **National Leadership**: Manage CCT (Central Command Team) and NEC (National Executive Committee)
   - **Provincial Leadership**: Manage PEC (Provincial Executive Committee) and PCT (Provincial Command Team)
   - **Regional Leadership**: Manage REC (Regional Executive Committee) and RCT (Regional Command Team)
   - **Municipal Leadership**: Manage SRCT (Sub-Regional Command Team)
   - **Ward Leadership**: Manage BEC (Branch Executive Committee) and BCT (Branch Command Team)
9. **System Settings Page**: Allows administrators to configure system parameters and view key statistics about the largest entities.

### Components
- **Navigation Bar**: For easy navigation between pages.
- **Data Tables**: For displaying member lists and analytics.
- **Charts**: For visualizing membership statistics.
- **Forms**: For user registration, role assignment, and voter verification.
- **Analytics Cards**: For displaying key metrics and insights.
- **Insights Panels**: For displaying observations and strategic recommendations based on analytics data.
- **Leadership Structure Components**:
  - **LeadershipStructureView**: Displays leadership roles for a specific structure (CCT, NEC, PEC, etc.)
  - **LeadershipAssignmentForm**: Form for assigning new leadership roles
  - **LeadershipHistoryTable**: Displays historical leadership roles for a specific entity
  - **LeadershipPositionCard**: Card displaying information about a leadership position and its holder

## 3. API Integration
- Use `axios` or `fetch` to interact with the backend API.
- Handle API responses and errors gracefully.
- Mock API service for development and testing with standardized response format:
  ```typescript
  {
    status: string, // 'success' or 'error'
    message: string, // Optional message
    data: any, // The actual data payload
    timestamp: string // ISO timestamp
  }
  ```

## 4. Analytics Features
- **Top Entities Analysis**: View and compare the top-performing wards, municipalities, and regions.
- **Growth Metrics**: Track membership growth over time at each hierarchical level.
- **Key Observations**: Automatically generated insights based on membership data.
- **Strategic Recommendations**: Suggestions for targeting recruitment and resource allocation.
- **Largest Entities Tracking**: Display of the largest entities by membership count:
  - Largest Ward: Ward 58 in Johannesburg Metropolitan, Gauteng (345 members)
  - Largest Municipality: Johannesburg Metropolitan in Gauteng (1,567 members)
  - Largest Region: City of Cape Town Metropolitan in Western Cape (1,850 members)

## 5. Leadership Management Features
- **Structure-Based Organization**: Leadership roles are organized by structure (CCT, NEC, PEC, PCT, etc.) within each hierarchical level
- **Role Assignment**: Assign members to leadership positions with specific start and end dates
- **Historical Tracking**: View historical leadership roles and transitions
- **Eligibility Verification**: System validates member eligibility for leadership positions
- **Position Management**: Prevent duplicate active positions and ensure proper role transitions
- **Leadership Metrics**: Track leadership stability and tenure across different structures

### Leadership API Hooks
```typescript
// National level hooks
useNationalLeadership(structureName: 'CCT' | 'NEC'): { data, loading, error }

// Provincial level hooks
useProvinceLeadership(provinceId: number, structureName: 'PEC' | 'PCT'): { data, loading, error }

// Regional level hooks
useRegionLeadership(regionId: number, structureName: 'REC' | 'RCT'): { data, loading, error }

// Municipal level hooks
useMunicipalLeadership(municipalityId: number, structureName: 'SRCT'): { data, loading, error }

// Ward level hooks
useWardLeadership(wardId: number, structureName: 'BEC' | 'BCT'): { data, loading, error }

// Leadership management hooks
useAssignLeadershipRole(): { assign, loading, error }
useUpdateLeadershipRole(): { update, loading, error }
useEndLeadershipRole(): { end, loading, error }
useAvailablePositions(level: string, entityId: number, structureName: string): { data, loading, error }
useEligibleMembers(level: string, entityId: number, structureName: string): { data, loading, error }
```

## 6. Responsive Design
- Use Tailwind CSS to ensure the UI is responsive and works on all devices.
- Responsive data tables and charts that adapt to different screen sizes.

## 7. Testing
- Use **Jest** and **React Testing Library** for unit and integration testing.