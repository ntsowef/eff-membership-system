# Frontend Integration Guide - Member Delete Functionality

## Quick Start for Frontend Developers

This guide shows how to integrate the member delete functionality into your frontend application.

## API Endpoints

### 1. Check Before Delete (Recommended First Step)
```javascript
GET /api/members/:id/delete-check
```

### 2. Delete Single Member
```javascript
DELETE /api/members/:id
```

### 3. Bulk Delete Members
```javascript
POST /api/members/bulk-delete
```

## React/Vue/Angular Examples

### Example 1: Delete Single Member with Confirmation

```javascript
// Function to check what will be deleted
async function checkMemberDeletion(memberId, authToken) {
  try {
    const response = await fetch(`http://localhost:5000/api/members/${memberId}/delete-check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Delete check failed:', error);
    throw error;
  }
}

// Function to delete member
async function deleteMember(memberId, authToken) {
  try {
    const response = await fetch(`http://localhost:5000/api/members/${memberId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Delete failed:', error);
    throw error;
  }
}

// Complete workflow with user confirmation
async function handleDeleteMember(memberId, authToken) {
  try {
    // Step 1: Check what will be deleted
    const checkData = await checkMemberDeletion(memberId, authToken);
    
    // Step 2: Show confirmation dialog with warnings
    const warningMessage = checkData.warnings.length > 0
      ? `\n\nWarnings:\n${checkData.warnings.join('\n')}`
      : '';
    
    const confirmed = confirm(
      `Are you sure you want to delete ${checkData.member_name} (${checkData.id_number})?` +
      warningMessage +
      `\n\n${checkData.cascade_info}`
    );
    
    if (!confirmed) {
      return { cancelled: true };
    }
    
    // Step 3: Perform deletion
    const deleteResult = await deleteMember(memberId, authToken);
    
    alert('Member deleted successfully!');
    return deleteResult;
    
  } catch (error) {
    alert(`Failed to delete member: ${error.message}`);
    throw error;
  }
}
```

### Example 2: Bulk Delete with Progress Tracking

```javascript
async function bulkDeleteMembers(memberIds, authToken, onProgress) {
  try {
    const response = await fetch('http://localhost:5000/api/members/bulk-delete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ member_ids: memberIds })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Call progress callback
      if (onProgress) {
        onProgress(result.data);
      }
      
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Bulk delete failed:', error);
    throw error;
  }
}

// Usage with progress tracking
async function handleBulkDelete(selectedMemberIds, authToken) {
  if (selectedMemberIds.length === 0) {
    alert('Please select members to delete');
    return;
  }
  
  if (selectedMemberIds.length > 100) {
    alert('Cannot delete more than 100 members at once');
    return;
  }
  
  const confirmed = confirm(
    `Are you sure you want to delete ${selectedMemberIds.length} member(s)?\n\n` +
    `This action cannot be undone.`
  );
  
  if (!confirmed) return;
  
  try {
    const result = await bulkDeleteMembers(selectedMemberIds, authToken, (progress) => {
      console.log(`Deleted: ${progress.deleted}, Failed: ${progress.failed}`);
    });
    
    // Show results
    if (result.failed > 0) {
      alert(
        `Bulk delete completed:\n` +
        `✓ Successfully deleted: ${result.deleted}\n` +
        `✗ Failed: ${result.failed}\n\n` +
        `Check console for error details.`
      );
      console.error('Failed deletions:', result.errors);
    } else {
      alert(`Successfully deleted ${result.deleted} member(s)!`);
    }
    
    return result;
    
  } catch (error) {
    alert(`Bulk delete failed: ${error.message}`);
    throw error;
  }
}
```

## React Component Example

```jsx
import React, { useState } from 'react';
import { useAuth } from './AuthContext'; // Your auth context

function MemberDeleteButton({ member, onDeleted }) {
  const { authToken } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [warnings, setWarnings] = useState([]);

  const handleCheckDelete = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/members/${member.member_id}/delete-check`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );
      const result = await response.json();
      
      if (result.success && result.data.warnings.length > 0) {
        setWarnings(result.data.warnings);
        setShowWarnings(true);
      } else {
        handleDelete();
      }
    } catch (error) {
      alert('Failed to check delete: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${member.firstname} ${member.surname}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/members/${member.member_id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );
      const result = await response.json();
      
      if (result.success) {
        alert('Member deleted successfully!');
        if (onDeleted) onDeleted(member.member_id);
      } else {
        alert('Delete failed: ' + result.message);
      }
    } catch (error) {
      alert('Delete failed: ' + error.message);
    } finally {
      setIsDeleting(false);
      setShowWarnings(false);
    }
  };

  return (
    <div>
      <button 
        onClick={handleCheckDelete}
        disabled={isDeleting}
        className="btn btn-danger"
      >
        {isDeleting ? 'Deleting...' : 'Delete Member'}
      </button>
      
      {showWarnings && (
        <div className="alert alert-warning mt-2">
          <h5>Warning:</h5>
          <ul>
            {warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
          <button onClick={handleDelete} className="btn btn-danger">
            Proceed with Delete
          </button>
          <button onClick={() => setShowWarnings(false)} className="btn btn-secondary ml-2">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default MemberDeleteButton;
```

## Error Handling

```javascript
async function deleteMemberWithErrorHandling(memberId, authToken) {
  try {
    const response = await fetch(`http://localhost:5000/api/members/${memberId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    // Handle different status codes
    if (response.status === 401) {
      throw new Error('Unauthorized - Please login again');
    } else if (response.status === 403) {
      throw new Error('Forbidden - You do not have permission to delete members');
    } else if (response.status === 404) {
      throw new Error('Member not found - May have already been deleted');
    } else if (!result.success) {
      throw new Error(result.message || 'Delete failed');
    }
    
    return result.data;
    
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}
```

## UI/UX Best Practices

1. **Always show confirmation dialogs** before deletion
2. **Display warnings** from the delete-check endpoint
3. **Show loading states** during deletion
4. **Provide feedback** on success/failure
5. **Refresh the list** after successful deletion
6. **Handle errors gracefully** with user-friendly messages
7. **Disable delete button** while operation is in progress
8. **For bulk delete**, show progress and results summary

## Testing Your Integration

```javascript
// Test data
const testMemberId = 123;
const testAuthToken = 'your-test-token';

// Test single delete
handleDeleteMember(testMemberId, testAuthToken)
  .then(result => console.log('Delete successful:', result))
  .catch(error => console.error('Delete failed:', error));

// Test bulk delete
const testMemberIds = [123, 456, 789];
handleBulkDelete(testMemberIds, testAuthToken)
  .then(result => console.log('Bulk delete successful:', result))
  .catch(error => console.error('Bulk delete failed:', error));
```

## Common Issues

**Issue:** 401 Unauthorized
**Solution:** Check that auth token is valid and not expired

**Issue:** 403 Forbidden
**Solution:** User needs `members.delete` permission

**Issue:** CORS errors
**Solution:** Ensure backend CORS is configured to allow your frontend origin

**Issue:** Network errors
**Solution:** Check that backend is running on correct port (5000)

## Support

For backend API issues, refer to:
- `docs/MEMBER_DELETE_FUNCTIONALITY.md` - Complete API documentation
- `MEMBER_DELETE_IMPLEMENTATION_SUMMARY.md` - Implementation details

