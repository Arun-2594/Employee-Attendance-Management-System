// components/EmployeeManagement.js
import React, { useState, useEffect } from 'react';
import './EmployeeManagement.css';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    password: '',
    gender: '',
    designation: '',
    salary: '',
    dateOfBirth: '',
    maritalStatus: '',
    department: '',
    role: 'employee'
  });

  // Salary form state
  const [salaryData, setSalaryData] = useState({
    basicSalary: '',
    allowances: '0',
    deductions: '0',
    payDate: '',
    payPeriod: ''
  });

  // Leave form state
  const [leaveForm, setLeaveForm] = useState({
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
      } else {
        setError('Failed to fetch employees');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeDetails(true);
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      employeeId: employee.employeeId,
      email: employee.email,
      password: '', // Don't pre-fill password for security
      gender: employee.gender,
      designation: employee.designation,
      salary: employee.salary,
      dateOfBirth: employee.dateOfBirth.split('T')[0],
      maritalStatus: employee.maritalStatus,
      department: employee.department,
      role: employee.role
    });
    setShowEditEmployee(true);
  };

  const handleSalaryClick = (employee) => {
    setSelectedEmployee(employee);
    setSalaryData({
      basicSalary: employee.salary.toString(),
      allowances: '0',
      deductions: '0',
      payDate: new Date().toISOString().split('T')[0],
      payPeriod: getCurrentPayPeriod()
    });
    setShowSalaryModal(true);
  };

  const handleLeaveClick = (employee) => {
    setSelectedEmployee(employee);
    setLeaveForm({
      leaveType: 'Sick Leave',
      startDate: '',
      endDate: '',
      reason: ''
    });
    setShowLeaveModal(true);
  };

  const getCurrentPayPeriod = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentDate = new Date();
    return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSalaryInputChange = (e) => {
    const { name, value } = e.target;
    setSalaryData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLeaveInputChange = (e) => {
    const { name, value } = e.target;
    setLeaveForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTotal = () => {
    const basic = parseFloat(salaryData.basicSalary) || 0;
    const allowances = parseFloat(salaryData.allowances) || 0;
    const deductions = parseFloat(salaryData.deductions) || 0;
    return (basic + allowances - deductions).toFixed(2);
  };

  const calculateLeaveDays = () => {
    if (leaveForm.startDate && leaveForm.endDate) {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const timeDiff = end.getTime() - start.getTime();
      return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    }
    return 0;
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setEmployees(prev => [...prev, data.data]);
        setShowAddEmployee(false);
        resetForm();
        alert('Employee added successfully!');
        
        // 🔥 Dispatch events for dashboard and attendance update
        window.dispatchEvent(new Event('employeeAdded'));
        window.dispatchEvent(new CustomEvent('employeeChanged', { 
          detail: { action: 'added', employee: data.data }
        }));
      } else {
        setError(data.message || 'Failed to add employee');
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/employees/${selectedEmployee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setEmployees(prev => 
          prev.map(emp => emp._id === selectedEmployee._id ? data.data : emp)
        );
        setShowEditEmployee(false);
        resetForm();
        alert('Employee updated successfully!');
        
        // 🔥 Dispatch events for dashboard and attendance update
        window.dispatchEvent(new Event('employeeUpdated'));
        window.dispatchEvent(new CustomEvent('employeeChanged', { 
          detail: { 
            action: 'updated', 
            employee: data.data, 
            oldEmployeeId: selectedEmployee.employeeId 
          }
        }));
      } else {
        setError(data.message || 'Failed to update employee');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee? This will also delete their attendance records.')) {
      return;
    }

    try {
      const employeeToDelete = employees.find(emp => emp._id === employeeId);
      const token = localStorage.getItem('token');
      
      // Delete employee's attendance records
      await fetch(`http://localhost:5000/api/attendance/employee/${employeeToDelete.employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Delete employee
      const response = await fetch(`http://localhost:5000/api/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setEmployees(prev => prev.filter(emp => emp._id !== employeeId));
        alert('Employee and their attendance records deleted successfully!');
        
        // Dispatch events for all components to update
        window.dispatchEvent(new Event('employeeDeleted'));
        window.dispatchEvent(new CustomEvent('employeeChanged', { 
          detail: { action: 'deleted', employee: employeeToDelete }
        }));
      } else {
        setError(data.message || 'Failed to delete employee');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      setError('Cannot connect to server');
    }
  };

  const handleAddSalary = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const salaryRecord = {
        employeeId: selectedEmployee.employeeId,
        employeeName: selectedEmployee.name,
        department: selectedEmployee.department,
        basicSalary: parseFloat(salaryData.basicSalary),
        allowances: parseFloat(salaryData.allowances),
        deductions: parseFloat(salaryData.deductions),
        total: parseFloat(calculateTotal()),
        payDate: salaryData.payDate,
        payPeriod: salaryData.payPeriod
      };

      const response = await fetch('http://localhost:5000/api/salaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(salaryRecord)
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Salary added successfully!');
        setShowSalaryModal(false);
        resetSalaryForm();
      } else {
        setError(data.message || 'Failed to add salary');
      }
    } catch (error) {
      console.error('Error adding salary:', error);
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const leaveData = {
        employeeId: selectedEmployee.employeeId,
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason
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
        alert('Leave application submitted successfully!');
        setShowLeaveModal(false);
        resetLeaveForm();
        
        // Dispatch event for leave update
        window.dispatchEvent(new Event('leaveApplied'));
      } else {
        setError(data.message || 'Failed to apply for leave');
      }
    } catch (error) {
      console.error('Error applying for leave:', error);
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      employeeId: '',
      email: '',
      password: '',
      gender: '',
      designation: '',
      salary: '',
      dateOfBirth: '',
      maritalStatus: '',
      department: '',
      role: 'employee'
    });
  };

  const resetSalaryForm = () => {
    setSalaryData({
      basicSalary: '',
      allowances: '0',
      deductions: '0',
      payDate: '',
      payPeriod: ''
    });
  };

  const resetLeaveForm = () => {
    setLeaveForm({
      leaveType: 'Sick Leave',
      startDate: '',
      endDate: '',
      reason: ''
    });
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && employees.length === 0) {
    return <div className="loading">Loading employees...</div>;
  }

  return (
    <div className="employee-management">
      <h2>Manage Employees</h2>
      
      {error && <div className="error-message">{error}</div>}

      <div className="search-add-container">
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Search By Employee ID" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          className="add-btn" 
          onClick={() => {
            resetForm();
            setShowAddEmployee(true);
          }}
          disabled={loading}
        >
          Add New Employee
        </button>
      </div>

      <table className="employee-table">
        <thead>
          <tr>
            <th>S No</th>
            <th>Image</th>
            <th>Name</th>
            <th>Employee ID</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.map((employee, index) => (
            <tr key={employee._id}>
              <td>{index + 1}</td>
              <td>
                <div className="employee-image">
                  {employee.name.charAt(0).toUpperCase()}
                </div>
              </td>
              <td>{employee.name}</td>
              <td>{employee.employeeId}</td>
              <td>{employee.department}</td>
              <td>{employee.designation}</td>
              <td>
                <div className="action-buttons">
                  <button 
                    className="view-btn"
                    onClick={() => handleViewEmployee(employee)}
                  >
                    View
                  </button>
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditEmployee(employee)}
                  >
                    Edit
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteEmployee(employee._id)}
                  >
                    Delete
                  </button>
                  <button 
                    className="salary-btn"
                    onClick={() => handleSalaryClick(employee)}
                  >
                    Salary
                  </button>
                  <button 
                    className="leave-btn"
                    onClick={() => handleLeaveClick(employee)}
                  >
                    Leave
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="table-footer">
        <span>Rows per page: 10</span>
        <span>1-{filteredEmployees.length} of {filteredEmployees.length}</span>
      </div>

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Employee</h3>
            <form onSubmit={handleAddEmployee} className="employee-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Insert Name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Insert Email"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Employee ID</label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    placeholder="Employee ID"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Marital Status</label>
                  <select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    placeholder="Designation"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="IT">IT</option>
                    <option value="Database">Database</option>
                    <option value="Logistic">Logistic</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Salary</label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    placeholder="Salary"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Password"
                    required
                  />
                </div>
              </div>
              <div className="form-buttons">
                <button 
                  type="button" 
                  onClick={() => setShowAddEmployee(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditEmployee && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Employee</h3>
            <form onSubmit={handleUpdateEmployee} className="employee-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Employee ID</label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Marital Status</label>
                  <select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="IT">IT</option>
                    <option value="Database">Database</option>
                    <option value="Logistic">Logistic</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Salary</label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="New password"
                  />
                </div>
              </div>
              <div className="form-buttons">
                <button 
                  type="button" 
                  onClick={() => setShowEditEmployee(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {showEmployeeDetails && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Employee Details</h3>
            <div className="employee-details">
              <p><strong>Name:</strong> {selectedEmployee.name}</p>
              <p><strong>Employee ID:</strong> {selectedEmployee.employeeId}</p>
              <p><strong>Email:</strong> {selectedEmployee.email}</p>
              <p><strong>Date of Birth:</strong> {new Date(selectedEmployee.dateOfBirth).toLocaleDateString()}</p>
              <p><strong>Gender:</strong> {selectedEmployee.gender}</p>
              <p><strong>Department:</strong> {selectedEmployee.department}</p>
              <p><strong>Designation:</strong> {selectedEmployee.designation}</p>
              <p><strong>Salary:</strong> ${selectedEmployee.salary}</p>
              <p><strong>Marital Status:</strong> {selectedEmployee.maritalStatus}</p>
            </div>
            <div className="form-buttons">
              <button onClick={() => setShowEmployeeDetails(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Modal */}
      {showSalaryModal && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <h3>Add New Salary</h3>
            <form onSubmit={handleAddSalary} className="salary-form">
              <div className="form-section">
                <h4>Department</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Select Department</label>
                    <select value={selectedEmployee.department} disabled>
                      <option>{selectedEmployee.department}</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Employee</label>
                    <select value={selectedEmployee.name} disabled>
                      <option>{selectedEmployee.name} ({selectedEmployee.employeeId})</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Basic Salary</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Insert Salary</label>
                    <input
                      type="number"
                      name="basicSalary"
                      value={salaryData.basicSalary}
                      onChange={handleSalaryInputChange}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Allowances</label>
                    <input
                      type="number"
                      name="allowances"
                      value={salaryData.allowances}
                      onChange={handleSalaryInputChange}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Deductions</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Pay Date</label>
                    <input
                      type="date"
                      name="payDate"
                      value={salaryData.payDate}
                      onChange={handleSalaryInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Deductions Amount</label>
                    <input
                      type="number"
                      name="deductions"
                      value={salaryData.deductions}
                      onChange={handleSalaryInputChange}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Pay Period</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Pay Period</label>
                    <select
                      name="payPeriod"
                      value={salaryData.payPeriod}
                      onChange={handleSalaryInputChange}
                      required
                    >
                      <option value="">Select Pay Period</option>
                      <option value="January 2025">January 2025</option>
                      <option value="February 2025">February 2025</option>
                      <option value="March 2025">March 2025</option>
                      <option value="April 2025">April 2025</option>
                      <option value="May 2025">May 2025</option>
                      <option value="June 2025">June 2025</option>
                      <option value="July 2025">July 2025</option>
                      <option value="August 2025">August 2025</option>
                      <option value="September 2025">September 2025</option>
                      <option value="October 2025">October 2025</option>
                      <option value="November 2025">November 2025</option>
                      <option value="December 2025">December 2025</option>
                    </select>
                  </div>
                  <div className="form-group total-group">
                    <label>Total</label>
                    <div className="total-amount">${calculateTotal()}</div>
                  </div>
                </div>
              </div>

              <div className="form-buttons">
                <button 
                  type="button" 
                  onClick={() => setShowSalaryModal(false)}
                  disabled={loading}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="add-salary-btn"
                >
                  {loading ? 'Adding...' : 'Add Salary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {showLeaveModal && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Apply for Leave</h3>
            <form onSubmit={handleApplyLeave} className="leave-form">
              <div className="form-group">
                <label>Select Employee *</label>
                <select value={`${selectedEmployee.name} (${selectedEmployee.employeeId})`} disabled>
                  <option>{selectedEmployee.name} ({selectedEmployee.employeeId})</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Leave Type *</label>
                <select
                  name="leaveType"
                  value={leaveForm.leaveType}
                  onChange={handleLeaveInputChange}
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
                    onChange={handleLeaveInputChange}
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
                    onChange={handleLeaveInputChange}
                    required
                    disabled={loading}
                    min={leaveForm.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              
              {calculateLeaveDays() > 0 && (
                <div className="days-info">
                  Total Leave Days: <strong>{calculateLeaveDays()} day(s)</strong>
                </div>
              )}
              
              <div className="form-group">
                <label>Reason for Leave *</label>
                <textarea 
                  name="reason"
                  value={leaveForm.reason}
                  onChange={handleLeaveInputChange}
                  required
                  disabled={loading}
                  placeholder="Please provide a detailed reason for your leave application..."
                  rows="4"
                />
              </div>
              
              <div className="form-buttons">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowLeaveModal(false);
                    resetLeaveForm();
                  }}
                  disabled={loading}
                  className="clear-btn"
                >
                  Clear Form
                </button>
                <button 
                  type="submit" 
                  disabled={loading || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason}
                  className="submit-leave-btn"
                >
                  {loading ? 'Submitting...' : 'Submit Leave Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;