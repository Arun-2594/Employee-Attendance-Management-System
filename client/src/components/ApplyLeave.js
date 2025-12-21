// components/ApplyLeave.js
import React, { useState, useEffect } from 'react';
import './ApplyLeave.css';

const ApplyLeave = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: 'Sick Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/employees', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLeaveForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateDays = () => {
    if (leaveForm.startDate && leaveForm.endDate) {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const timeDiff = end.getTime() - start.getTime();
      return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    }
    return 0;
  };

  const handleSubmit = async (e) => {
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
      const response = await fetch('http://localhost:5000/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(leaveData)
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Leave application submitted successfully!');
        setLeaveForm({
          employeeId: '',
          leaveType: 'Sick Leave',
          startDate: '',
          endDate: '',
          reason: ''
        });
        
        // Dispatch event to refresh leave management
        window.dispatchEvent(new Event('leaveApplied'));
      } else {
        setError(data.message || 'Failed to submit leave application');
      }
    } catch (error) {
      console.error('Error submitting leave application:', error);
      setError('Cannot connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const days = calculateDays();

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return (
    <div className="apply-leave">
      <h2>Apply for Leave</h2>
      
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

      <form onSubmit={handleSubmit} className="leave-application-form">
        <div className="form-group">
          <label>Select Employee *</label>
          <select
            name="employeeId"
            value={leaveForm.employeeId}
            onChange={handleInputChange}
            required
            disabled={loading}
          >
            <option value="">Choose an employee</option>
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
          <div className="days-calculation">
            <strong>Total Leave Days: {days} day(s)</strong>
          </div>
        )}

        <div className="form-group">
          <label>Reason for Leave *</label>
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

        <div className="form-actions">
          <button 
            type="button" 
            onClick={() => {
              setLeaveForm({
                employeeId: '',
                leaveType: 'Sick Leave',
                startDate: '',
                endDate: '',
                reason: ''
              });
              clearMessages();
            }}
            disabled={loading}
            className="clear-btn"
          >
            Clear Form
          </button>
          <button 
            type="submit" 
            disabled={loading || !leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason}
            className="submit-btn"
          >
            {loading ? 'Submitting...' : 'Submit Leave Application'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ApplyLeave;