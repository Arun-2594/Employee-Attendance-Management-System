// components/LeaveManagement.js
import React, { useState, useEffect } from 'react';
import API from "../api";
import './LeaveManagement.css';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showLeaveDetails, setShowLeaveDetails] = useState(false);
  const [showApplyLeave, setShowApplyLeave] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);

  // Leave statistics
  const [leaveStats, setLeaveStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    approvalRate: 0,
    rejectionRate: 0
  });

  // Form data for applying leave
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: 'Sick Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
    fetchLeaveStats();
  }, []);

  // Calculate statistics when leaves change
  useEffect(() => {
    calculateStats(leaves);
  }, [leaves]);

  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.get('/api/leaves', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = response.data;
      if (data.success) {
        setLeaves(data.data);
      } else {
        setError(data.message || 'Failed to fetch leaves');
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
      setError('Cannot connect to server. Please check if backend is running.');
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.get('/api/employees', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = response.data;
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchLeaveStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.get('/api/leaves/stats/overview', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = response.data;
      if (data.success) {
        setLeaveStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching leave stats:', error);
    }
  };

  const calculateStats = (leavesData) => {
    const total = leavesData.length;
    const approved = leavesData.filter(leave => leave.status === 'Approved').length;
    const pending = leavesData.filter(leave => leave.status === 'Pending').length;
    const rejected = leavesData.filter(leave => leave.status === 'Rejected').length;
    
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

    setLeaveStats(prev => ({
      ...prev,
      total,
      approved,
      pending,
      rejected,
      approvalRate,
      rejectionRate
    }));
  };

  const handleViewLeave = (leave) => {
    setSelectedLeave(leave);
    setShowLeaveDetails(true);
  };

  const handleLeaveStatus = async (status) => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await API.put(`/api/leaves/${selectedLeave._id}/status`,
        {
          status,
          approvedBy: "System Admin",
          comments: `Leave ${status.toLowerCase()} by System Admin`
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = response.data;
      
      if (data.success) {
        setLeaves(prev => 
          prev.map(leave => leave._id === selectedLeave._id ? data.data : leave)
        );
        setShowLeaveDetails(false);
        setSuccess(`Leave ${status.toLowerCase()} successfully!`);
        
        // Dispatch event for dashboard update
        window.dispatchEvent(new Event('leaveStatusUpdated'));
        
        // Refresh stats
        fetchLeaveStats();
      } else {
        setError(data.message || `Failed to ${status.toLowerCase()} leave`);
      }
    } catch (error) {
      console.error('Error updating leave status:', error);
      setError('Cannot connect to server. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get employee details
      const selectedEmployee = employees.find(emp => emp.employeeId === leaveForm.employeeId);
      if (!selectedEmployee) {
        setError('Selected employee not found');
        setLoading(false);
        return;
      }

      const leaveData = {
        ...leaveForm,
        employeeName: selectedEmployee.name,
        department: selectedEmployee.department
      };

      const token = localStorage.getItem('token');
      const response = await API.post('/api/leaves', leaveData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = response.data;
      
      if (data.success) {
        setLeaves(prev => [data.data, ...prev]);
        setShowApplyLeave(false);
        setLeaveForm({
          employeeId: '',
          leaveType: 'Sick Leave',
          startDate: '',
          endDate: '',
          reason: ''
        });
        setSuccess('Leave application submitted successfully!');
        
        // Dispatch event for dashboard update
        window.dispatchEvent(new Event('leaveApplied'));
        
        // Refresh stats
        fetchLeaveStats();
      } else {
        setError(data.message || 'Failed to apply for leave');
      }
    } catch (error) {
      console.error('Error applying for leave:', error);
      setError('Cannot connect to server. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to delete this leave application?')) {
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await API.delete(`/api/leaves/${leaveId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = response.data;
      
      if (data.success) {
        setLeaves(prev => prev.filter(leave => leave._id !== leaveId));
        setSuccess('Leave application deleted successfully!');
        
        // Refresh stats
        fetchLeaveStats();
      } else {
        setError(data.message || 'Failed to delete leave application');
      }
    } catch (error) {
      console.error('Error deleting leave:', error);
      setError('Cannot connect to server. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLeaveForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filter leaves based on search term
  const filteredLeaves = leaves.filter(leave =>
    leave.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leave.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leave.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leave.leaveType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const indexOfLastRecord = currentPage * rowsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
  const currentLeaves = filteredLeaves.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredLeaves.length / rowsPerPage);

  // Calculate days between dates for the form
  const calculateDays = () => {
    if (leaveForm.startDate && leaveForm.endDate) {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const timeDiff = end.getTime() - start.getTime();
      return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    }
    return 0;
  };

  const days = calculateDays();

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return (
    <div className="leave-management">
      <h2>Leave Management</h2>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={clearMessages} className="error-close-btn">×</button>
        </div>
      )}
      
      {success && (
        <div className="success-message">
          {success}
          <button onClick={clearMessages} className="success-close-btn">×</button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="leave-stats">
        <div className="stat-card total">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <h3>{leaveStats.total}</h3>
            <p>Total applications</p>
          </div>
        </div>
        
        <div className="stat-card approved">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{leaveStats.approved}</h3>
            <p>Leave Approved</p>
            <span className="stat-rate">{leaveStats.approvalRate}% approval rate</span>
          </div>
        </div>
        
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>{leaveStats.pending}</h3>
            <p>Leave Pending</p>
            <span className="stat-rate">Awaiting review</span>
          </div>
        </div>
        
        <div className="stat-card rejected">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <h3>{leaveStats.rejected}</h3>
            <p>Leave Rejected</p>
            <span className="stat-rate">{leaveStats.rejectionRate}% rejection rate</span>
          </div>
        </div>
      </div>

      {/* Search and Action Buttons */}
      <div className="search-action-container">
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Search By Emp ID, Name, Department or Leave Type" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="action-buttons">
          <button 
            className="apply-btn"
            onClick={() => setShowApplyLeave(true)}
            disabled={loading}
          >
            Apply Leave
          </button>
          <button 
            className="refresh-btn"
            onClick={() => {
              fetchLeaves();
              fetchLeaveStats();
            }}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Leaves Table */}
      <table className="leave-table">
        <thead>
          <tr>
            <th>S No</th>
            <th>Emp ID</th>
            <th>Name</th>
            <th>Leave Type</th>
            <th>Department</th>
            <th>Days</th>
            <th>Status</th>
            <th>Applied Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentLeaves.map((leave, index) => (
            <tr key={leave._id} className={`status-${leave.status.toLowerCase()}`}>
              <td>{indexOfFirstRecord + index + 1}</td>
              <td>{leave.employeeId}</td>
              <td>{leave.employeeName}</td>
              <td>{leave.leaveType}</td>
              <td>{leave.department}</td>
              <td>{leave.days}</td>
              <td>
                <span className={`status-badge ${leave.status.toLowerCase()}`}>
                  {leave.status}
                </span>
              </td>
              <td>{new Date(leave.appliedDate).toLocaleDateString()}</td>
              <td>
                <div className="action-buttons">
                  <button 
                    className="view-btn"
                    onClick={() => handleViewLeave(leave)}
                  >
                    View
                  </button>
                  {leave.status === 'Pending' && (
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteLeave(leave._id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {filteredLeaves.length === 0 && (
            <tr>
              <td colSpan="9" className="no-data">
                No leave applications found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination Footer */}
      <div className="table-footer">
        <span>Rows per page: {rowsPerPage}</span>
        <span>
          {filteredLeaves.length === 0 ? '0' : `${indexOfFirstRecord + 1}-${Math.min(indexOfLastRecord, filteredLeaves.length)}`} of {filteredLeaves.length}
        </span>
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </button>
        </div>
      </div>

      {/* Leave Details Modal */}
      {showLeaveDetails && selectedLeave && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Leave Application Details</h3>
            <div className="leave-details">
              <div className="detail-row">
                <span className="label">Name:</span>
                <span className="value">{selectedLeave.employeeName}</span>
              </div>
              <div className="detail-row">
                <span className="label">Employee ID:</span>
                <span className="value">{selectedLeave.employeeId}</span>
              </div>
              <div className="detail-row">
                <span className="label">Department:</span>
                <span className="value">{selectedLeave.department}</span>
              </div>
              <div className="detail-row">
                <span className="label">Leave Type:</span>
                <span className="value">{selectedLeave.leaveType}</span>
              </div>
              <div className="detail-row">
                <span className="label">Start Date:</span>
                <span className="value">{new Date(selectedLeave.startDate).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="label">End Date:</span>
                <span className="value">{new Date(selectedLeave.endDate).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="label">Days:</span>
                <span className="value">{selectedLeave.days} days</span>
              </div>
              <div className="detail-row">
                <span className="label">Applied Date:</span>
                <span className="value">{new Date(selectedLeave.appliedDate).toLocaleDateString()}</span>
              </div>
              <div className="detail-row full-width">
                <span className="label">Reason:</span>
                <div className="reason-text">{selectedLeave.reason}</div>
              </div>
              <div className="detail-row">
                <span className="label">Status:</span>
                <span className={`status-badge ${selectedLeave.status.toLowerCase()}`}>
                  {selectedLeave.status}
                </span>
              </div>
              {selectedLeave.approvedBy && (
                <div className="detail-row">
                  <span className="label">Approved By:</span>
                  <span className="value">{selectedLeave.approvedBy}</span>
                </div>
              )}
              {selectedLeave.comments && (
                <div className="detail-row full-width">
                  <span className="label">Comments:</span>
                  <div className="reason-text">{selectedLeave.comments}</div>
                </div>
              )}
            </div>
            
            {selectedLeave.status === 'Pending' && (
              <div className="action-buttons modal-actions">
                <button 
                  className="accept-btn"
                  onClick={() => handleLeaveStatus('Approved')}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Approve Leave'}
                </button>
                <button 
                  className="reject-btn"
                  onClick={() => handleLeaveStatus('Rejected')}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Reject Leave'}
                </button>
              </div>
            )}
            <div className="form-buttons">
              <button onClick={() => setShowLeaveDetails(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyLeave && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Apply for Leave</h3>
            <form onSubmit={handleApplyLeave} className="leave-form">
              <div className="form-group">
                <label>Employee *</label>
                <select
                  name="employeeId"
                  value={leaveForm.employeeId}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp.employeeId}>
                      {emp.name} ({emp.employeeId}) - {emp.department}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Leave Type *</label>
                <select
                  name="leaveType"
                  value={leaveForm.leaveType}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                >
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Paternity Leave">Paternity Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                </select>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input 
                    type="date" 
                    name="startDate"
                    value={leaveForm.startDate}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input 
                    type="date" 
                    name="endDate"
                    value={leaveForm.endDate}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    min={leaveForm.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              
              {days > 0 && (
                <div className="days-info">
                  Total Leave Days: <strong>{days} day(s)</strong>
                </div>
              )}
              
              <div className="form-group">
                <label>Reason *</label>
                <textarea 
                  name="reason"
                  value={leaveForm.reason}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="Please provide a detailed reason for your leave application..."
                  rows="4"
                />
              </div>
              
              <div className="form-buttons">
                <button 
                  type="button" 
                  onClick={() => setShowApplyLeave(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading || !leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;