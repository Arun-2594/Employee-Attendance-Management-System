// server/routes/salaryRoutes.js
const express = require('express');
const Salary = require('../models/Salary');
const Employee = require('../models/Employee');
const router = express.Router();

// Get all salaries
router.get('/', async (req, res) => {
  try {
    const salaries = await Salary.find().sort({ payDate: -1 });
    res.json({
      success: true,
      data: salaries
    });
  } catch (error) {
    console.error('Get salaries error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching salaries' 
    });
  }
});

// Get salary by ID
router.get('/:id', async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({ 
        success: false,
        message: 'Salary record not found' 
      });
    }
    res.json({
      success: true,
      data: salary
    });
  } catch (error) {
    console.error('Get salary error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching salary record' 
    });
  }
});

// Create new salary
router.post('/', async (req, res) => {
  try {
    const salaryData = req.body;
    
    // Calculate total
    salaryData.total = salaryData.basicSalary + salaryData.allowances - salaryData.deductions;

    const salary = new Salary(salaryData);
    const savedSalary = await salary.save();

    res.status(201).json({
      success: true,
      data: savedSalary,
      message: 'Salary record created successfully'
    });
  } catch (error) {
    console.error('Create salary error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating salary record' 
    });
  }
});

// Update salary
router.put('/:id', async (req, res) => {
  try {
    const salaryData = req.body;
    
    // Recalculate total if basicSalary, allowances, or deductions are updated
    if (salaryData.basicSalary || salaryData.allowances || salaryData.deductions) {
      salaryData.total = (salaryData.basicSalary || 0) + 
                        (salaryData.allowances || 0) - 
                        (salaryData.deductions || 0);
    }

    const salary = await Salary.findByIdAndUpdate(
      req.params.id,
      salaryData,
      { new: true, runValidators: true }
    );

    if (!salary) {
      return res.status(404).json({ 
        success: false,
        message: 'Salary record not found' 
      });
    }

    res.json({
      success: true,
      data: salary,
      message: 'Salary record updated successfully'
    });
  } catch (error) {
    console.error('Update salary error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating salary record' 
    });
  }
});

// Delete salary
router.delete('/:id', async (req, res) => {
  try {
    const salary = await Salary.findByIdAndDelete(req.params.id);
    
    if (!salary) {
      return res.status(404).json({ 
        success: false,
        message: 'Salary record not found' 
      });
    }

    res.json({
      success: true,
      message: 'Salary record deleted successfully'
    });
  } catch (error) {
    console.error('Delete salary error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting salary record' 
    });
  }
});

// Get salaries by employee ID
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const salaries = await Salary.find({ 
      employeeId: req.params.employeeId 
    }).sort({ payDate: -1 });

    res.json({
      success: true,
      data: salaries
    });
  } catch (error) {
    console.error('Get employee salaries error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching employee salaries' 
    });
  }
});

// Generate salary slip
router.post('/generate-slip', async (req, res) => {
  try {
    const { employeeId, payPeriod } = req.body;
    
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    // In a real scenario, you would calculate salary based on attendance, leaves, etc.
    const salaryData = {
      employeeId: employee.employeeId,
      employeeName: employee.name,
      department: employee.department,
      basicSalary: employee.salary,
      allowances: 50, // Example fixed allowance
      deductions: 30, // Example fixed deduction
      total: employee.salary + 50 - 30,
      payDate: new Date(),
      payPeriod: payPeriod
    };

    const salary = new Salary(salaryData);
    const savedSalary = await salary.save();

    res.json({
      success: true,
      data: savedSalary,
      message: 'Salary slip generated successfully'
    });
  } catch (error) {
    console.error('Generate salary slip error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating salary slip' 
    });
  }
});

module.exports = router;