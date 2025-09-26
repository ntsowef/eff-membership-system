// Mock meetings data for development
export const mockMeetings = [
  {
    id: 1,
    title: "Ward 9 Monthly Committee Meeting",
    description: "Monthly ward committee meeting to discuss community issues and upcoming projects.",
    hierarchy_level: "Ward",
    entity_id: 9,
    meeting_type: "Regular",
    start_datetime: "2025-09-15T14:00:00Z",
    end_datetime: "2025-09-15T16:00:00Z",
    location: "Greater Letaba Community Hall",
    virtual_meeting_link: "https://zoom.us/j/123456789",
    meeting_status: "Scheduled",
    max_attendees: 50,
    created_by: 1,
    created_at: "2025-08-20T10:00:00Z",
    updated_at: "2025-08-20T10:00:00Z",
    creator_name: "Admin User",
    entity_name: "Ward 9 - Greater Letaba",
    attendee_count: 0,
    present_count: 0,
    absent_count: 0,
    excused_count: 0,
    late_count: 0
  },
  {
    id: 2,
    title: "Provincial Executive Meeting",
    description: "Quarterly provincial executive meeting to review performance and strategic planning.",
    hierarchy_level: "Province",
    entity_id: 1,
    meeting_type: "Special",
    start_datetime: "2025-09-20T09:00:00Z",
    end_datetime: "2025-09-20T12:00:00Z",
    location: "Provincial Headquarters",
    virtual_meeting_link: null,
    meeting_status: "Scheduled",
    max_attendees: 100,
    created_by: 1,
    created_at: "2025-08-15T08:00:00Z",
    updated_at: "2025-08-15T08:00:00Z",
    creator_name: "Admin User",
    entity_name: "Limpopo Province",
    attendee_count: 0,
    present_count: 0,
    absent_count: 0,
    excused_count: 0,
    late_count: 0
  },
  {
    id: 3,
    title: "Emergency Municipal Meeting",
    description: "Emergency meeting to address urgent infrastructure issues in the municipality.",
    hierarchy_level: "Municipality",
    entity_id: 5,
    meeting_type: "Emergency",
    start_datetime: "2025-08-30T16:00:00Z",
    end_datetime: "2025-08-30T18:00:00Z",
    location: "Municipal Chambers",
    virtual_meeting_link: "https://teams.microsoft.com/l/meetup-join/...",
    meeting_status: "Completed",
    max_attendees: 50,
    created_by: 2,
    created_at: "2025-08-25T14:00:00Z",
    updated_at: "2025-08-30T18:00:00Z",
    creator_name: "Municipal Admin",
    entity_name: "Greater Letaba Municipality",
    attendee_count: 28,
    present_count: 22,
    absent_count: 4,
    excused_count: 2,
    late_count: 0
  },
  {
    id: 4,
    title: "Annual General Meeting",
    description: "Annual general meeting for all members to review yearly performance and elect leadership.",
    hierarchy_level: "National",
    entity_id: 1,
    meeting_type: "Annual",
    start_datetime: "2025-12-15T10:00:00Z",
    end_datetime: "2025-12-15T17:00:00Z",
    location: "National Convention Centre",
    virtual_meeting_link: "https://zoom.us/j/987654321",
    meeting_status: "Scheduled",
    max_attendees: 1000,
    created_by: 1,
    created_at: "2025-07-01T09:00:00Z",
    updated_at: "2025-07-01T09:00:00Z",
    creator_name: "National Admin",
    entity_name: "National Organization",
    attendee_count: 0,
    present_count: 0,
    absent_count: 0,
    excused_count: 0,
    late_count: 0
  },
  {
    id: 5,
    title: "Ward 19 Community Forum",
    description: "Community forum meeting cancelled due to venue unavailability.",
    hierarchy_level: "Ward",
    entity_id: 19,
    meeting_type: "Regular",
    start_datetime: "2025-08-25T18:00:00Z",
    end_datetime: "2025-08-25T20:00:00Z",
    location: "Community Centre",
    virtual_meeting_link: null,
    meeting_status: "Cancelled",
    max_attendees: 75,
    created_by: 3,
    created_at: "2025-08-10T12:00:00Z",
    updated_at: "2025-08-24T15:00:00Z",
    creator_name: "Ward Admin",
    entity_name: "Ward 19 - Greater Letaba",
    attendee_count: 0,
    present_count: 0,
    absent_count: 0,
    excused_count: 0,
    late_count: 0
  }
];

export const getMockMeetings = () => {
  return {
    success: true,
    data: {
      meetings: mockMeetings,
      total: mockMeetings.length,
      page: 1,
      limit: 50
    }
  };
};

export const getMockMeetingById = (id: number) => {
  const meeting = mockMeetings.find(m => m.id === id);
  if (meeting) {
    return {
      success: true,
      data: {
        meeting
      }
    };
  }
  return {
    success: false,
    error: {
      message: 'Meeting not found'
    }
  };
};
