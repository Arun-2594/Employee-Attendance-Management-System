// components/DepartmentManagement.js
import React, { useState, useEffect } from 'react';
import './DepartmentManagement.css';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [showEditDepartment, setShowEditDepartment] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/departments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data);
      } else {
        setError('Failed to fetch departments');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setDepartments(prev => [...prev, data.data]);
        setShowAddDepartment(false);
        setFormData({ name: '', description: '' });
        alert('Department added successfully!');
        
        // Dispatch event for dashboard update
        window.dispatchEvent(new Event('departmentAdded'));
      } else {
        setError(data.message || 'Failed to add department');
      }
    } catch (error) {
      console.error('Error adding department:', error);
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDepartment = (department) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || ''
    });
    setShowEditDepartment(true);
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/departments/${selectedDepartment._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setDepartments(prev => 
          prev.map(dept => dept._id === selectedDepartment._id ? data.data : dept)
        );
        setShowEditDepartment(false);
        setFormData({ name: '', description: '' });
        alert('Department updated successfully!');
        
        // Dispatch event for dashboard update
        window.dispatchEvent(new Event('departmentUpdated'));
      } else {
        setError(data.message || 'Failed to update department');
      }
    } catch (error) {
      console.error('Error updating department:', error);
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (departmentId) => {
    const departmentToDelete = departments.find(dept => dept._id === departmentId);
    
    // Check if department has employees
    const employeesInDepartment = employees.filter(emp => emp.department === departmentToDelete.name);
    
    if (employeesInDepartment.length > 0) {
      setError(`Cannot delete department. There are ${employeesInDepartment.length} employees in this department.`);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this department?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/departments/${departmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setDepartments(prev => prev.filter(dept => dept._id !== departmentId));
        alert('Department deleted successfully!');
        
        // Dispatch event for dashboard update
        window.dispatchEvent(new Event('departmentDeleted'));
      } else {
        setError(data.message || 'Failed to delete department');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      setError('Cannot connect to server');
    }
  };

  // Calculate employee count for each department
  const departmentsWithCount = departments.map(dept => {
    const employeeCount = employees.filter(emp => emp.department === dept.name).length;
    return {
      ...dept,
      totalEmployees: employeeCount
    };
  });

  const filteredDepartments = departmentsWithCount.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && departments.length === 0) {
    return <div className="loading">Loading departments...</div>;
  }

  return (
    <div className="department-management">
      <h2>Manage Departments</h2>
      
      {error && (
        <div className="error-message">
          {error}
          <button 
            onClick={() => setError('')} 
            className="error-close-btn"
          >
            ×
          </button>
        </div>
      )}

      <div className="search-add-container">
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Search By Department" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          className="add-btn" 
          onClick={() => setShowAddDepartment(true)}
          disabled={loading}
        >
          Add New Department
        </button>
      </div>

      <table className="department-table">
        <thead>
          <tr>
            <th>S No</th>
            <th>Department</th>
            <th>Total Employees</th>
            <th>Description</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredDepartments.map((department, index) => (
            <tr key={department._id}>
              <td>{index + 1}</td>
              <td>{department.name}</td>
              <td>{department.totalEmployees}</td>
              <td>{department.description || 'No description'}</td>
              <td>
                <div className="action-buttons">
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditDepartment(department)}
                  >
                    Edit
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteDepartment(department._id)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="table-footer">
        <span>Rows per page: 10</span>
        <span>1-{filteredDepartments.length} of {filteredDepartments.length}</span>
      </div>

      {/* Add Department Modal */}
      {showAddDepartment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Department</h3>
            <form onSubmit={handleAddDepartment} className="department-form">
              <div className="form-group">
                <label>Department Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Department Name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description"
                  rows="4"
                ></textarea>
              </div>
              <div className="form-buttons">
                <button 
                  type="button" 
                  onClick={() => setShowAddDepartment(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditDepartment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Department</h3>
            <form onSubmit={handleUpdateDepartment} className="department-form">
              <div className="form-group">
                <label>Department Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                ></textarea>
              </div>
              <div className="form-buttons">
                <button 
                  type="button" 
                  onClick={() => setShowEditDepartment(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;