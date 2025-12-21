// server/routes/departmentRoutes.js
const express = require('express');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const router = express.Router();

// Get all departments
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching departments' 
    });
  }
});

// Get department by ID
router.get('/:id', async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ 
        success: false,
        message: 'Department not found' 
      });
    }
    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching department' 
    });
  }
});

// Create new department
router.post('/', async (req, res) => {
  try {
    const departmentData = req.body;
    
    // Check if department already exists
    const existingDepartment = await Department.findOne({ 
      name: departmentData.name 
    });
    
    if (existingDepartment) {
      return res.status(400).json({ 
        success: false,
        message: 'Department already exists' 
      });
    }

    const department = new Department(departmentData);
    const savedDepartment = await department.save();

    res.status(201).json({
      success: true,
      data: savedDepartment,
      message: 'Department created successfully'
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating department' 
    });
  }
});

// Update department
router.put('/:id', async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({ 
        success: false,
        message: 'Department not found' 
      });
    }

    res.json({
      success: true,
      data: department,
      message: 'Department updated successfully'
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating department' 
    });
  }
});

// Delete department
router.delete('/:id', async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return res.status(404).json({ 
        success: false,
        message: 'Department not found' 
      });
    }

    // Check if department has employees
    const employeeCount = await Employee.countDocuments({ 
      department: department.name 
    });
    
    if (employeeCount > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Cannot delete department. There are ${employeeCount} employees in this department.` 
      });
    }

    await Department.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting department' 
    });
  }
});

module.exports = router;