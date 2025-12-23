// components/SalaryManagement.js
import React, { useState, useEffect } from 'react';
import API from "../api";
import './SalaryManagement.css';

const SalaryManagement = () => {
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showAddSalary, setShowAddSalary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    employeeId: '',
    basicSalary: '',
    allowances: '0',
    deductions: '0',
    payDate: '',
    payPeriod: ''
  });

  useEffect(() => {
    fetchSalaries();
    fetchEmployees();
  }, []);

  const fetchSalaries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.get('/api/salaries', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = response.data;
      if (data.success) {
        setSalaries(data.data);
      }
    } catch (error) {
      console.error('Error fetching salaries:', error);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSalary = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedEmployee = employees.find(emp => emp.employeeId === formData.employeeId);
      if (!selectedEmployee) {
        setError('Selected employee not found');
        return;
      }

      const salaryData = {
        ...formData,
        employeeName: selectedEmployee.name,
        department: selectedEmployee.department,
        total: parseFloat(formData.basicSalary) + parseFloat(formData.allowances) - parseFloat(formData.deductions),
        payDate: new Date(formData.payDate).toISOString()
      };

      const token = localStorage.getItem('token');
      const response = await API.post('/api/salaries', salaryData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data;
      
      if (data.success) {
        setSalaries(prev => [data.data, ...prev]);
        setShowAddSalary(false);
        setFormData({
          employeeId: '',
          basicSalary: '',
          allowances: '0',
          deductions: '0',
          payDate: '',
          payPeriod: ''
        });
        alert('Salary added successfully!');
        
        // 🔥 Dispatch event for dashboard update
        window.dispatchEvent(new Event('salaryAdded'));
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

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  return (
    <div className="salary-management">
      <h2>Salary History</h2>
      
      {error && <div className="error-message">{error}</div>}

      <div className="search-add-container">
        <div className="search-box">
          <input type="text" placeholder="Search By Emp ID" />
        </div>
        <button 
          className="add-btn" 
          onClick={() => {
            setFormData({
              employeeId: '',
              basicSalary: '',
              allowances: '0',
              deductions: '0',
              payDate: today,
              payPeriod: currentMonth
            });
            setShowAddSalary(true);
          }}
        >
          Add New Salary
        </button>
      </div>

      <table className="salary-table">
        <thead>
          <tr>
            <th>SNO</th>
            <th>EMP ID</th>
            <th>SALARY</th>
            <th>ALLOWANCE</th>
            <th>DEDUCTION</th>
            <th>TOTAL</th>
            <th>PAY DATE</th>
          </tr>
        </thead>
        <tbody>
          {salaries.map((salary, index) => (
            <tr key={salary._id}>
              <td>{index + 1}</td>
              <td>{salary.employeeId}</td>
              <td>${salary.basicSalary}</td>
              <td>${salary.allowances}</td>
              <td>${salary.deductions}</td>
              <td>${salary.total}</td>
              <td>{new Date(salary.payDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showAddSalary && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Salary</h3>
            <form onSubmit={handleAddSalary} className="salary-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <select disabled>
                    <option>Select Department first</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Employee</label>
                  <select
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp.employeeId}>
                        {emp.name} ({emp.employeeId}) - {emp.department}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Basic Salary</label>
                  <input
                    type="number"
                    name="basicSalary"
                    value={formData.basicSalary}
                    onChange={handleInputChange}
                    placeholder="Insert Salary"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Allowances</label>
                  <input
                    type="number"
                    name="allowances"
                    value={formData.allowances}
                    onChange={handleInputChange}
                    placeholder="Monthly Allowances"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Deductions</label>
                  <input
                    type="number"
                    name="deductions"
                    value={formData.deductions}
                    onChange={handleInputChange}
                    placeholder="Monthly Deductions"
                  />
                </div>
                <div className="form-group">
                  <label>Pay Date</label>
                  <input
                    type="date"
                    name="payDate"
                    value={formData.payDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Pay Period</label>
                  <input
                    type="text"
                    name="payPeriod"
                    value={formData.payPeriod}
                    onChange={handleInputChange}
                    placeholder="e.g., September 2024"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Total</label>
                  <input
                    type="text"
                    value={`$${(
                      parseFloat(formData.basicSalary || 0) +
                      parseFloat(formData.allowances || 0) -
                      parseFloat(formData.deductions || 0)
                    ).toFixed(2)}`}
                    disabled
                  />
                </div>
              </div>
              <div className="form-buttons">
                <button 
                  type="button" 
                  onClick={() => setShowAddSalary(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Salary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;