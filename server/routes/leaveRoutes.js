// routes/leaveRoutes.js
const express = require('express');
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const router = express.Router();

// Get all leaves with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      employeeId, 
      department, 
      leaveType,
      startDate,
      endDate,
      page = 1, 
      limit = 10 
    } = req.query;
    
    let query = {};
    
    // Build query based on filters
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (employeeId) {
      query.employeeId = { $regex: employeeId, $options: 'i' };
    }
    
    if (department && department !== 'all') {
      query.department = { $regex: department, $options: 'i' };
    }

    if (leaveType && leaveType !== 'all') {
      query.leaveType = leaveType;
    }

    // Date range filter
    if (startDate || endDate) {
      query.appliedDate = {};
      if (startDate) query.appliedDate.$gte = new Date(startDate);
      if (endDate) query.appliedDate.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { appliedDate: -1 }
    };

    const leaves = await Leave.find(query)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const total = await Leave.countDocuments(query);

    res.json({
      success: true,
      data: leaves,
      pagination: {
        currentPage: options.page,
        totalPages: Math.ceil(total / options.limit),
        totalItems: total,
        itemsPerPage: options.limit
      }
    });
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching leave records' 
    });
  }
});

// Get leave by ID
router.get('/:id', async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave application not found' 
      });
    }
    res.json({
      success: true,
      data: leave
    });
  } catch (error) {
    console.error('Get leave error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching leave application' 
    });
  }
});

// Create new leave application
router.post('/', async (req, res) => {
  try {
    const { employeeId, startDate, endDate, leaveType, reason } = req.body;
    
    // Validate required fields
    if (!employeeId || !startDate || !endDate || !leaveType || !reason) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: employeeId, startDate, endDate, leaveType, reason'
      });
    }

    // Check if employee exists
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past'
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date'
      });
    }

    // Calculate days
    const timeDiff = end.getTime() - start.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    if (days < 1) {
      return res.status(400).json({
        success: false,
        message: 'Leave duration must be at least 1 day'
      });
    }

    // Check for overlapping leave applications
    const overlappingLeave = await Leave.findOne({
      employeeId,
      status: { $in: ['Pending', 'Approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlappingLeave) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${overlappingLeave.status.toLowerCase()} leave application from ${overlappingLeave.startDate.toLocaleDateString()} to ${overlappingLeave.endDate.toLocaleDateString()}`
      });
    }

    const leaveData = {
      employeeId,
      employeeName: employee.name,
      department: employee.department,
      startDate: start,
      endDate: end,
      leaveType,
      reason: reason.trim(),
      days
    };

    const leave = new Leave(leaveData);
    const savedLeave = await leave.save();

    res.status(201).json({
      success: true,
      data: savedLeave,
      message: 'Leave application submitted successfully and is pending approval'
    });
  } catch (error) {
    console.error('Create leave error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(err => err.message).join(', ')
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Error creating leave application' 
    });
  }
});

// Update leave status (Approve/Reject)
router.put('/:id/status', async (req, res) => {
  try {
    const { status, comments, approvedBy } = req.body;
    
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "Approved" or "Rejected"'
      });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave application not found' 
      });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Leave application is already ${leave.status.toLowerCase()}`
      });
    }

    const updateData = {
      status,
      approvedDate: new Date(),
      comments: comments || ''
    };

    if (approvedBy) {
      updateData.approvedBy = approvedBy;
    }

    const updatedLeave = await Leave.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedLeave,
      message: `Leave application ${status.toLowerCase()} successfully`
    });
  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating leave status' 
    });
  }
});

// Update leave application
router.put('/:id', async (req, res) => {
  try {
    const { startDate, endDate, leaveType, reason } = req.body;
    
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave application not found' 
      });
    }

    // Only allow updates for pending leaves
    if (leave.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending leave applications can be updated'
      });
    }

    const updateData = {};

    if (leaveType) updateData.leaveType = leaveType;
    if (reason) updateData.reason = reason.trim();

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        return res.status(400).json({
          success: false,
          message: 'Start date cannot be in the past'
        });
      }

      if (start > end) {
        return res.status(400).json({
          success: false,
          message: 'End date cannot be before start date'
        });
      }

      const timeDiff = end.getTime() - start.getTime();
      const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      // Check for overlapping leave applications (excluding current one)
      const overlappingLeave = await Leave.findOne({
        employeeId: leave.employeeId,
        status: { $in: ['Pending', 'Approved'] },
        _id: { $ne: leave._id },
        $or: [
          { startDate: { $lte: end }, endDate: { $gte: start } }
        ]
      });

      if (overlappingLeave) {
        return res.status(400).json({
          success: false,
          message: 'This leave period conflicts with another leave application'
        });
      }

      updateData.startDate = start;
      updateData.endDate = end;
      updateData.days = days;
    }

    const updatedLeave = await Leave.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedLeave,
      message: 'Leave application updated successfully'
    });
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating leave application' 
    });
  }
});

// Delete leave application
router.delete('/:id', async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    
    if (!leave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave application not found' 
      });
    }

    // Only allow deletion for pending leaves
    if (leave.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending leave applications can be deleted'
      });
    }

    await Leave.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Leave application deleted successfully'
    });
  } catch (error) {
    console.error('Delete leave error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting leave application' 
    });
  }
});

// Get leaves by employee ID
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    // Check if employee exists
    const employee = await Employee.findOne({ employeeId: req.params.employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    let query = { employeeId: req.params.employeeId };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const leaves = await Leave.find(query)
      .sort({ appliedDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Leave.countDocuments(query);

    res.json({
      success: true,
      data: leaves,
      employee: {
        name: employee.name,
        department: employee.department
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    console.error('Get employee leaves error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching employee leave records' 
    });
  }
});

// Get leave statistics for overview
router.get('/stats/overview', async (req, res) => {
  try {
    const totalLeaves = await Leave.countDocuments();
    const pendingLeaves = await Leave.countDocuments({ status: 'Pending' });
    const approvedLeaves = await Leave.countDocuments({ status: 'Approved' });
    const rejectedLeaves = await Leave.countDocuments({ status: 'Rejected' });

    const approvalRate = totalLeaves > 0 ? Math.round((approvedLeaves / totalLeaves) * 100) : 0;
    const rejectionRate = totalLeaves > 0 ? Math.round((rejectedLeaves / totalLeaves) * 100) : 0;

    // Get leave distribution by type
    const leaveByType = await Leave.aggregate([
      {
        $group: {
          _id: '$leaveType',
          count: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get current month statistics
    const currentMonth = new Date();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const monthlyStats = await Leave.aggregate([
      {
        $match: {
          appliedDate: { $gte: firstDay, $lte: lastDay }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyData = {
      pending: 0,
      approved: 0,
      rejected: 0
    };

    monthlyStats.forEach(stat => {
      monthlyData[stat._id.toLowerCase()] = stat.count;
    });

    res.json({
      success: true,
      data: {
        total: totalLeaves,
        pending: pendingLeaves,
        approved: approvedLeaves,
        rejected: rejectedLeaves,
        approvalRate,
        rejectionRate,
        leaveByType,
        monthly: monthlyData
      }
    });
  } catch (error) {
    console.error('Get leave stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching leave statistics' 
    });
  }
});

// Get dashboard statistics
router.get('/stats/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Current month statistics
    const monthlyStats = await Leave.aggregate([
      {
        $match: {
          appliedDate: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Today's pending leaves
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayPending = await Leave.countDocuments({
      appliedDate: {
        $gte: todayStart,
        $lte: todayEnd
      },
      status: 'Pending'
    });

    // Active leaves (approved and within date range)
    const activeLeaves = await Leave.countDocuments({
      status: 'Approved',
      startDate: { $lte: today },
      endDate: { $gte: today }
    });

    const monthlyData = {
      pending: 0,
      approved: 0,
      rejected: 0
    };

    monthlyStats.forEach(stat => {
      monthlyData[stat._id.toLowerCase()] = stat.count;
    });

    res.json({
      success: true,
      data: {
        monthly: monthlyData,
        todayPending,
        activeLeaves,
        totalEmployees: await Employee.countDocuments()
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching dashboard statistics' 
    });
  }
});

// Get employee leave balance
router.get('/employee/:employeeId/balance', async (req, res) => {
  try {
    const employee = await Employee.findOne({ employeeId: req.params.employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Calculate approved leaves for current year
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const approvedLeaves = await Leave.find({
      employeeId: req.params.employeeId,
      status: 'Approved',
      startDate: { $gte: startOfYear, $lte: endOfYear }
    });

    const totalApprovedDays = approvedLeaves.reduce((sum, leave) => sum + leave.days, 0);

    // Define leave quotas (adjust based on your company policy)
    const leaveQuotas = {
      'Sick Leave': 12,
      'Casual Leave': 12,
      'Annual Leave': 15,
      'Maternity Leave': 180,
      'Paternity Leave': 15,
      'Emergency Leave': 5
    };

    const balance = {};
    Object.keys(leaveQuotas).forEach(type => {
      const usedDays = approvedLeaves
        .filter(leave => leave.leaveType === type)
        .reduce((sum, leave) => sum + leave.days, 0);
      
      balance[type] = Math.max(0, leaveQuotas[type] - usedDays);
    });

    res.json({
      success: true,
      data: {
        employeeId: req.params.employeeId,
        employeeName: employee.name,
        totalApprovedDays,
        balance
      }
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching leave balance' 
    });
  }
});

// Get recent leaves (for dashboard)
router.get('/recent/:limit?', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 5;
    
    const recentLeaves = await Leave.find()
      .sort({ appliedDate: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: recentLeaves
    });
  } catch (error) {
    console.error('Get recent leaves error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching recent leaves' 
    });
  }
});

module.exports = router;