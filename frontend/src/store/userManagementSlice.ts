import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { UserManagementAPI, type User, type UserCreationWorkflow, type UserSession, type MFAStatus, type UserStatistics } from '../lib/userManagementApi';

// Async thunks for user management
export const fetchAdmins = createAsyncThunk(
  'userManagement/fetchAdmins',
  async (params?: {
    admin_level?: string;
    province_code?: string;
    district_code?: string;
    municipal_code?: string;
    ward_code?: string;
    is_active?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await UserManagementAPI.getAdmins(params);
    return response.data;
  }
);

export const createAdmin = createAsyncThunk(
  'userManagement/createAdmin',
  async (adminData: {
    name: string;
    email: string;
    password: string;
    admin_level: 'national' | 'province' | 'district' | 'municipality' | 'ward';
    role_name: string;
    province_code?: string;
    district_code?: string;
    municipal_code?: string;
    ward_code?: string;
    justification?: string;
  }) => {
    const response = await UserManagementAPI.createAdmin(adminData);
    return response.data;
  }
);

export const fetchUserStatistics = createAsyncThunk(
  'userManagement/fetchUserStatistics',
  async () => {
    const response = await UserManagementAPI.getUserStatistics();
    return response.data;
  }
);

export const fetchPendingWorkflows = createAsyncThunk(
  'userManagement/fetchPendingWorkflows',
  async () => {
    const response = await UserManagementAPI.getPendingWorkflows();
    return response.data;
  }
);

export const reviewWorkflow = createAsyncThunk(
  'userManagement/reviewWorkflow',
  async ({ workflowId, action, review_notes }: {
    workflowId: number;
    action: 'approve' | 'reject';
    review_notes?: string;
  }) => {
    const response = await UserManagementAPI.reviewWorkflow(workflowId, { action, review_notes });
    return { workflowId, ...response.data };
  }
);

export const fetchMySessions = createAsyncThunk(
  'userManagement/fetchMySessions',
  async () => {
    const response = await UserManagementAPI.getMySessions();
    return response.data;
  }
);

export const terminateSession = createAsyncThunk(
  'userManagement/terminateSession',
  async ({ sessionId, reason }: { sessionId: string; reason?: string }) => {
    const response = await UserManagementAPI.terminateSession(sessionId, reason);
    return { sessionId, ...response.data };
  }
);

export const fetchMFAStatus = createAsyncThunk(
  'userManagement/fetchMFAStatus',
  async () => {
    const response = await UserManagementAPI.getMFAStatus();
    return response.data;
  }
);

export const enableMFA = createAsyncThunk(
  'userManagement/enableMFA',
  async (token: string) => {
    const response = await UserManagementAPI.enableMFA(token);
    return response.data;
  }
);

export const generateMFASetup = createAsyncThunk(
  'userManagement/generateMFASetup',
  async () => {
    const response = await UserManagementAPI.generateMFASetup();
    return response.data;
  }
);

// Initial state
interface UserManagementState {
  // Admin management
  admins: User[];
  adminsPagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  adminsLoading: boolean;
  adminsError: string | null;

  // User statistics
  userStatistics: UserStatistics | null;
  statisticsLoading: boolean;
  statisticsError: string | null;

  // Workflows
  pendingWorkflows: UserCreationWorkflow[];
  workflowsLoading: boolean;
  workflowsError: string | null;

  // Sessions
  mySessions: UserSession[];
  sessionsLoading: boolean;
  sessionsError: string | null;

  // MFA
  mfaStatus: MFAStatus | null;
  mfaSetup: {
    qr_code?: string;
    manual_entry_key?: string;
    backup_codes?: string[];
  } | null;
  mfaLoading: boolean;
  mfaError: string | null;

  // UI state
  selectedUsers: number[];
  filters: {
    admin_level?: string;
    province_code?: string;
    district_code?: string;
    municipal_code?: string;
    ward_code?: string;
    is_active?: string;
  };
}

const initialState: UserManagementState = {
  admins: [],
  adminsPagination: {
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  },
  adminsLoading: false,
  adminsError: null,

  userStatistics: null,
  statisticsLoading: false,
  statisticsError: null,

  pendingWorkflows: [],
  workflowsLoading: false,
  workflowsError: null,

  mySessions: [],
  sessionsLoading: false,
  sessionsError: null,

  mfaStatus: null,
  mfaSetup: null,
  mfaLoading: false,
  mfaError: null,

  selectedUsers: [],
  filters: {}
};

// User management slice
const userManagementSlice = createSlice({
  name: 'userManagement',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<UserManagementState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSelectedUsers: (state, action: PayloadAction<number[]>) => {
      state.selectedUsers = action.payload;
    },
    toggleUserSelection: (state, action: PayloadAction<number>) => {
      const userId = action.payload;
      const index = state.selectedUsers.indexOf(userId);
      if (index > -1) {
        state.selectedUsers.splice(index, 1);
      } else {
        state.selectedUsers.push(userId);
      }
    },
    clearUserSelection: (state) => {
      state.selectedUsers = [];
    },
    clearMFASetup: (state) => {
      state.mfaSetup = null;
    },
    clearErrors: (state) => {
      state.adminsError = null;
      state.statisticsError = null;
      state.workflowsError = null;
      state.sessionsError = null;
      state.mfaError = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch admins
    builder
      .addCase(fetchAdmins.pending, (state) => {
        state.adminsLoading = true;
        state.adminsError = null;
      })
      .addCase(fetchAdmins.fulfilled, (state, action) => {
        state.adminsLoading = false;
        state.admins = action.payload.admins;
        state.adminsPagination = action.payload.pagination;
      })
      .addCase(fetchAdmins.rejected, (state, action) => {
        state.adminsLoading = false;
        state.adminsError = action.error.message || 'Failed to fetch admins';
      });

    // Create admin
    builder
      .addCase(createAdmin.pending, (state) => {
        state.adminsLoading = true;
        state.adminsError = null;
      })
      .addCase(createAdmin.fulfilled, (state) => {
        state.adminsLoading = false;
        // Refresh admins list after creation
      })
      .addCase(createAdmin.rejected, (state, action) => {
        state.adminsLoading = false;
        state.adminsError = action.error.message || 'Failed to create admin';
      });

    // Fetch user statistics
    builder
      .addCase(fetchUserStatistics.pending, (state) => {
        state.statisticsLoading = true;
        state.statisticsError = null;
      })
      .addCase(fetchUserStatistics.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.userStatistics = action.payload.user_statistics;
      })
      .addCase(fetchUserStatistics.rejected, (state, action) => {
        state.statisticsLoading = false;
        state.statisticsError = action.error.message || 'Failed to fetch statistics';
      });

    // Fetch pending workflows
    builder
      .addCase(fetchPendingWorkflows.pending, (state) => {
        state.workflowsLoading = true;
        state.workflowsError = null;
      })
      .addCase(fetchPendingWorkflows.fulfilled, (state, action) => {
        state.workflowsLoading = false;
        state.pendingWorkflows = action.payload.workflows;
      })
      .addCase(fetchPendingWorkflows.rejected, (state, action) => {
        state.workflowsLoading = false;
        state.workflowsError = action.error.message || 'Failed to fetch workflows';
      });

    // Review workflow
    builder
      .addCase(reviewWorkflow.fulfilled, (state, action) => {
        const { workflowId } = action.payload;
        state.pendingWorkflows = state.pendingWorkflows.filter(w => w.id !== workflowId);
      });

    // Fetch my sessions
    builder
      .addCase(fetchMySessions.pending, (state) => {
        state.sessionsLoading = true;
        state.sessionsError = null;
      })
      .addCase(fetchMySessions.fulfilled, (state, action) => {
        state.sessionsLoading = false;
        state.mySessions = action.payload.sessions;
      })
      .addCase(fetchMySessions.rejected, (state, action) => {
        state.sessionsLoading = false;
        state.sessionsError = action.error.message || 'Failed to fetch sessions';
      });

    // Terminate session
    builder
      .addCase(terminateSession.fulfilled, (state, action) => {
        const { sessionId } = action.payload;
        state.mySessions = state.mySessions.filter(s => s.session_id !== sessionId);
      });

    // Fetch MFA status
    builder
      .addCase(fetchMFAStatus.pending, (state) => {
        state.mfaLoading = true;
        state.mfaError = null;
      })
      .addCase(fetchMFAStatus.fulfilled, (state, action) => {
        state.mfaLoading = false;
        state.mfaStatus = action.payload;
      })
      .addCase(fetchMFAStatus.rejected, (state, action) => {
        state.mfaLoading = false;
        state.mfaError = action.error.message || 'Failed to fetch MFA status';
      });

    // Generate MFA setup
    builder
      .addCase(generateMFASetup.pending, (state) => {
        state.mfaLoading = true;
        state.mfaError = null;
      })
      .addCase(generateMFASetup.fulfilled, (state, action) => {
        state.mfaLoading = false;
        state.mfaSetup = action.payload;
      })
      .addCase(generateMFASetup.rejected, (state, action) => {
        state.mfaLoading = false;
        state.mfaError = action.error.message || 'Failed to generate MFA setup';
      });

    // Enable MFA
    builder
      .addCase(enableMFA.fulfilled, (state, action) => {
        state.mfaStatus = { ...state.mfaStatus!, enabled: true };
        state.mfaSetup = null;
      });
  }
});

export const {
  setFilters,
  clearFilters,
  setSelectedUsers,
  toggleUserSelection,
  clearUserSelection,
  clearMFASetup,
  clearErrors
} = userManagementSlice.actions;

export default userManagementSlice.reducer;
