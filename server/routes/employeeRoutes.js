// server/routes/employeeRoutes.js
const express = require('express');
const Employee = require('../models/Employee');
const router = express.Router();

// Get all employees
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching employees' 
    });
  }
});

// Get employee by ID
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }
    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching employee' 
    });
  }
});

// Create new employee
router.post('/', async (req, res) => {
  try {
    const employeeData = req.body;
    
    // Check if employee ID already exists
    const existingEmployee = await Employee.findOne({ 
      employeeId: employeeData.employeeId 
    });
    
    if (existingEmployee) {
      return res.status(400).json({ 
        success: false,
        message: 'Employee ID already exists' 
      });
    }

    const employee = new Employee(employeeData);
    const savedEmployee = await employee.save();

    res.status(201).json({
      success: true,
      data: savedEmployee,
      message: 'Employee created successfully'
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating employee' 
    });
  }
});

// Update employee
router.put('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    res.json({
      success: true,
      data: employee,
      message: 'Employee updated successfully'
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating employee' 
    });
  }
});

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting employee' 
    });
  }
});

// Search employees
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const employees = await Employee.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { employeeId: { $regex: query, $options: 'i' } },
        { department: { $regex: query, $options: 'i' } }
      ]
    });

    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Search employees error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error searching employees' 
    });
  }
});

module.exports = router;