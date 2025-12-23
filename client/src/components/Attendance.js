import React, { useState, useEffect } from 'react';
import API from "../api";
import './Attendance.css';

// **FIX: Helper Function for Consistent Local Date String**
const getLocalDateString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-CA', { 
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// **NEW: Format time to 12-hour format with AM/PM**
const formatTimeTo12Hour = (timeString) => {
  if (!timeString) return '-';
  
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// **NEW: Format date to DD/MM/YYYY**
const formatDateToDDMMYYYY = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

const Attendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);
  const [showEditAttendance, setShowEditAttendance] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);

  // Add state for statistics
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0
  });

  const [formData, setFormData] = useState({
    employeeId: '',
    date: '',
    checkIn: '',
    checkOut: '',
    status: 'Present'
  });

  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
    
    // 🔥 Listen for employee changes
    const handleEmployeeChange = (event) => {
      const { action, employee, oldEmployeeId } = event.detail;
      
      if (action === 'deleted') {
        // Remove attendance records for deleted employee
        setAttendance(prev => prev.filter(record => record.employeeId !== employee.employeeId));
      } else if (action === 'updated' && oldEmployeeId !== employee.employeeId) {
        // Update employee ID in attendance records if it changed
        setAttendance(prev => 
          prev.map(record => 
            record.employeeId === oldEmployeeId 
              ? { ...record, employeeId: employee.employeeId, employeeName: employee.name }
              : record
          )
        );
      } else if (action === 'added') {
        // Refresh employees list when new employee is added
        fetchEmployees();
      }
      
      // Refresh employees list
      fetchEmployees();
    };

    // Listen for employee deletion events
    const handleEmployeeDeleted = () => {
      fetchAttendance(); // Refresh attendance data
      fetchEmployees(); // Refresh employees list
    };

    window.addEventListener('employeeChanged', handleEmployeeChange);
    window.addEventListener('employeeDeleted', handleEmployeeDeleted);
    
    return () => {
      window.removeEventListener('employeeChanged', handleEmployeeChange);
      window.removeEventListener('employeeDeleted', handleEmployeeDeleted);
    };
  }, []);

  // Calculate statistics whenever attendance data changes
  useEffect(() => {
    calculateStats(attendance);
  }, [attendance]);

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.get("/api/attendance", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = response.data;
      if (data.success) {
        setAttendance(data.data);
      } else {
        setError('Failed to fetch attendance records');
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setError('Cannot connect to server. Please check if backend is running.');
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.get("/api/employees", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = response.data;
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  // **FIXED: Calculate statistics based on today's attendance**
  const calculateStats = (attendanceData) => {
    // Get today's date in a consistent, local-timezone-based string format
    const todayString = getLocalDateString(new Date()); 
    
    // Filter today's attendance records
    const todayAttendance = attendanceData.filter(record => {
      // Get the record date in the same consistent local-timezone-based string format
      const recordDateString = getLocalDateString(record.date);
      return recordDateString === todayString;
    });

    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0
    };

    todayAttendance.forEach(record => {
      switch (record.status) {
        case 'Present':
          stats.present++;
          break;
        case 'Absent':
          stats.absent++;
          break;
        case 'Late':
          stats.late++;
          break;
        case 'Half Day':
          stats.halfDay++;
          break;
        default:
          break;
      }
    });

    setAttendanceStats(stats);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get the selected employee details
      const selectedEmployee = employees.find(emp => emp.employeeId === formData.employeeId);
      if (!selectedEmployee) {
        setError('Selected employee not found');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await API.post(
        "/api/attendance/mark", 
        {
          ...formData,
          employeeName: selectedEmployee.name,
          department: selectedEmployee.department,
          date: new Date(formData.date).toISOString(),
          checkIn: formData.checkIn ? new Date(`${formData.date}T${formData.checkIn}`).toISOString() : null,
          checkOut: formData.checkOut ? new Date(`${formData.date}T${formData.checkOut}`).toISOString() : null
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAttendance(prev => [data.data, ...prev]);
        setShowMarkAttendance(false);
        setFormData({
          employeeId: '',
          date: '',
          checkIn: '',
          checkOut: '',
          status: 'Present'
        });
        alert('Attendance marked successfully!');
        
        // 🔥 Dispatch event for dashboard update
        window.dispatchEvent(new Event('attendanceMarked'));
      } else {
        setError(data.message || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      setError('Cannot connect to server. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAttendance = (record) => {
    setSelectedRecord(record);
    setFormData({
      employeeId: record.employeeId,
      date: new Date(record.date).toISOString().split('T')[0],
      checkIn: record.checkIn ? new Date(record.checkIn).toTimeString().slice(0, 5) : '',
      checkOut: record.checkOut ? new Date(record.checkOut).toTimeString().slice(0, 5) : '',
      status: record.status
    });
    setShowEditAttendance(true);
  };

  const handleUpdateAttendance = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await API.put(
        `/api/attendance/${selectedRecord._id}`, 
        {
          ...formData,
          date: new Date(formData.date).toISOString(),
          checkIn: formData.checkIn ? new Date(`${formData.date}T${formData.checkIn}`).toISOString() : null,
          checkOut: formData.checkOut ? new Date(`${formData.date}T${formData.checkOut}`).toISOString() : null
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = response.data;
      
      if (data.success) {
        setAttendance(prev => 
          prev.map(record => record._id === selectedRecord._id ? data.data : record)
        );
        setShowEditAttendance(false);
        alert('Attendance updated successfully!');
        
        // 🔥 Dispatch event for dashboard update
        window.dispatchEvent(new Event('attendanceUpdated'));
      } else {
        setError(data.message || 'Failed to update attendance');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      setError('Cannot connect to server. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttendance = async (attendanceId) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await API.delete(`/api/attendance/${attendanceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = response.data;
      
      if (data.success) {
        setAttendance(prev => prev.filter(record => record._id !== attendanceId));
        alert('Attendance record deleted successfully!');
        
        // 🔥 Dispatch event for dashboard update
        window.dispatchEvent(new Event('attendanceUpdated'));
      } else {
        setError(data.message || 'Failed to delete attendance record');
      }
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      setError('Cannot connect to server. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    // Simple CSV export implementation
    const headers = ['S No', 'Employee ID', 'Name', 'Date', 'Check In', 'Check Out', 'Status'];
    const csvData = filteredAttendance.map((record, index) => [
      index + 1,
      record.employeeId,
      record.employeeName,
      formatDateToDDMMYYYY(record.date),
      record.checkIn ? formatTimeTo12Hour(record.checkIn) : '-',
      record.checkOut ? formatTimeTo12Hour(record.checkOut) : '-',
      record.status
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Filter attendance based on search term and ensure employee exists
  const filteredAttendance = attendance.filter(record => {
    const employeeExists = employees.some(emp => emp.employeeId === record.employeeId);
    
    if (!employeeExists) {
      return false; // Skip records for deleted employees
    }

    return (
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // **NEW: Pagination logic**
  const indexOfLastRecord = currentPage * rowsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
  const currentRecords = filteredAttendance.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredAttendance.length / rowsPerPage);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="attendance-management">
      <h2>Attendance Management</h2>
      
      {error && (
        <div className="error-message">
          {error}
          <button 
            onClick={() => setError('')} 
            className="error-close-btn"
            style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#721c24', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      <div className="attendance-stats">
        <div className="stat-card">
          <h3>Today's Attendance</h3>
          <div className="attendance-overview">
            <div className="attendance-item">
              <span className="label">Present:</span>
              <span className="value present">{attendanceStats.present}</span>
            </div>
            <div className="attendance-item">
              <span className="label">Absent:</span>
              <span className="value absent">{attendanceStats.absent}</span>
            </div>
            <div className="attendance-item">
              <span className="label">Late:</span>
              <span className="value late">{attendanceStats.late}</span>
            </div>
            <div className="attendance-item">
              <span className="label">Half Day:</span>
              <span className="value half-day">{attendanceStats.halfDay}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="search-add-container">
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Search By Employee ID or Name" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="action-buttons">
          <button 
            className="add-btn" 
            onClick={() => {
              setFormData({
                employeeId: '',
                date: today,
                checkIn: '',
                checkOut: '',
                status: 'Present'
              });
              setShowMarkAttendance(true);
            }}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Mark Attendance'}
          </button>
          <button className="export-btn" onClick={handleExportReport}>
            Export Report
          </button>
        </div>
        
      </div>

      <table className="attendance-table">
        <thead>
          <tr>
            <th>S No</th>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Date</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentRecords.map((record, index) => (
            <tr 
                key={record._id}
                className={`attendance-row status-${record.status.toLowerCase().replace(' ', '-')}`}
            >
              <td>{indexOfFirstRecord + index + 1}</td>
              <td>{record.employeeId}</td>
              <td>{record.employeeName}</td>
              <td>{formatDateToDDMMYYYY(record.date)}</td>
              <td>{record.checkIn ? formatTimeTo12Hour(record.checkIn) : '-'}</td>
              <td>{record.checkOut ? formatTimeTo12Hour(record.checkOut) : '-'}</td>
              <td>
                <span className={`status-badge ${record.status.toLowerCase().replace(' ', '-')}`}>
                  {record.status}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditAttendance(record)}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteAttendance(record._id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {filteredAttendance.length === 0 && (
            <tr>
              <td colSpan="8" className="no-data">
                No attendance records found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* **FIXED: Pagination footer */}
      <div className="table-footer">
        <span>Rows per page: {rowsPerPage}</span>
        <span>
          {filteredAttendance.length === 0 ? '0' : `${indexOfFirstRecord + 1}-${Math.min(indexOfLastRecord, filteredAttendance.length)}`} of {filteredAttendance.length}
        </span>
      </div>

      {/* Mark Attendance Modal */}
      {showMarkAttendance && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Mark Attendance</h3>
            <form onSubmit={handleMarkAttendance} className="attendance-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Employee</label>
                  <select
                    name="employeeId"
                    value={formData.employeeId}
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
                  <label>Date</label>
                  <input 
                    type="date" 
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Check In Time</label>
                  <input 
                    type="time" 
                    name="checkIn"
                    value={formData.checkIn}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>Check Out Time</label>
                  <input 
                    type="time" 
                    name="checkOut"
                    value={formData.checkOut}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                  </select>
                </div>
              </div>
              <div className="form-buttons">
                <button 
                  type="button" 
                  onClick={() => setShowMarkAttendance(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? 'Marking...' : 'Mark Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Attendance Modal */}
      {showEditAttendance && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Attendance</h3>
            <form onSubmit={handleUpdateAttendance} className="attendance-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Employee</label>
                  <input
                    type="text"
                    value={selectedRecord?.employeeName}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input 
                    type="date" 
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Check In Time</label>
                  <input 
                    type="time" 
                    name="checkIn"
                    value={formData.checkIn}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>Check Out Time</label>
                  <input 
                    type="time" 
                    name="checkOut"
                    value={formData.checkOut}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                  </select>
                </div>
              </div>
              <div className="form-buttons">
                <button 
                  type="button" 
                  onClick={() => setShowEditAttendance(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
             
export default Attendance;