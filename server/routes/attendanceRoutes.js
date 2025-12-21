// server/routes/attendanceRoutes.js
const express = require('express');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const router = express.Router();

// 💡 HELPER: Get today's start and end boundaries (Midnight to Midnight in local tconst bcrypt = require('bcryptjs');ime)
const getTodayDateRange = () => {
    const now = new Date();
    
    // Create 'today' start date (midnight today in server's local timezone)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Create 'tomorrow' start date (midnight tomorrow in server's local timezone)
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    return {
        start: todayStart, // This will be the start of the day in UTC
        end: tomorrowStart // This will be the end of the day in UTC
    };
};

// Get all attendance records
router.get('/', async (req, res) => {
  try {
    const attendance = await Attendance.find().sort({ date: -1 });
    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching attendance records' 
    });
  }
});

// Check in
router.post('/checkin', async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    // **FIX: Use consistent date range for check in lookup**
    const { start, end } = getTodayDateRange(); 

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: start,
        $lt: end
      }
    });

    if (existingAttendance && existingAttendance.checkIn) {
      return res.status(400).json({ 
        success: false,
        message: 'Already checked in today' 
      });
    }

    const checkInTime = new Date();
    let status = 'Present';
    
    // Check if late (after 9:30 AM)
    if (checkInTime.getHours() > 9 || 
        (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 30)) {
      status = 'Late';
    }

    const attendanceData = {
      employeeId,
      employeeName: employee.name,
      // **FIX: Use the calculated date start for the 'date' field**
      date: start, 
      checkIn: checkInTime,
      status,
      department: employee.department
    };

    let attendance;
    if (existingAttendance) {
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        attendanceData,
        { new: true }
      );
    } else {
      attendance = new Attendance(attendanceData);
      await attendance.save();
    }

    res.json({
      success: true,
      data: attendance,
      message: `Checked in successfully at ${checkInTime.toLocaleTimeString()}`
    });
  } catch (error) {
    console.error('Check in error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error during check in' 
    });
  }
});

// Check out
router.post('/checkout', async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    // **FIX: Use consistent date range for check out lookup**
    const { start, end } = getTodayDateRange(); 

    const attendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: start,
        $lt: end
      }
    });

    if (!attendance) {
      return res.status(400).json({ 
        success: false,
        message: 'No check in record found for today' 
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ 
        success: false,
        message: 'Already checked out today' 
      });
    }

    const checkOutTime = new Date();
    
    // Calculate hours worked
    const hoursWorked = (checkOutTime - attendance.checkIn) / (1000 * 60 * 60);
    
    // Update status to Half Day if worked less than 4 hours
    let finalStatus = attendance.status;
    if (hoursWorked < 4) {
      finalStatus = 'Half Day';
    }

    attendance.checkOut = checkOutTime;
    attendance.hoursWorked = parseFloat(hoursWorked.toFixed(2));
    attendance.status = finalStatus;
    
    await attendance.save();

    res.json({
      success: true,
      data: attendance,
      message: `Checked out successfully at ${checkOutTime.toLocaleTimeString()}`
    });
  } catch (error) {
    console.error('Check out error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error during check out' 
    });
  }
});

// Get today's attendance
router.get('/today', async (req, res) => {
  try {
    // **FIX: Use consistent date range**
    const { start, end } = getTodayDateRange();

    const attendance = await Attendance.find({
      date: {
        $gte: start,
        $lt: end
      }
    }).sort({ checkIn: 1 });

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching today\'s attendance' 
    });
  }
});

// Get attendance by employee ID
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    let query = { employeeId };
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(query).sort({ date: -1 });

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Get employee attendance error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching employee attendance' 
    });
  }
});

// Get today's attendance summary 
router.get('/today-summary', async (req, res) => {
  try {
    console.log('Fetching today summary...');
    
    // **FIX: Use consistent date range**
    const { start, end } = getTodayDateRange();
    
    // Get all employees
    const allEmployees = await Employee.find({});
    const totalEmployees = allEmployees.length;
    
    console.log('Total employees:', totalEmployees);

    // Get today's attendance records
    const todayAttendance = await Attendance.find({
      date: {
        $gte: start,
        $lt: end
      }
    });

    console.log('Today attendance records:', todayAttendance.length);

    // Initialize counters
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;

    // Count each status from today's attendance
    todayAttendance.forEach(record => {
      switch (record.status) {
        case 'Present':
          presentCount++;
          break;
        case 'Late':
          lateCount++;
          break;
        case 'Half Day':
          halfDayCount++;
          break;
        case 'Absent':
          absentCount++;
          break;
      }
    });

    // Employees without attendance records are considered absent
    const employeesWithAttendance = todayAttendance.length;
    const employeesWithoutAttendance = totalEmployees - employeesWithAttendance;
    
    // Total absent includes both marked absent and employees without records
    const totalAbsent = absentCount + employeesWithoutAttendance;
    
    // Total present includes present, late, and half day
    const totalPresent = presentCount + lateCount + halfDayCount;

    console.log('Counts:', {
      present: presentCount,
      late: lateCount,
      halfDay: halfDayCount,
      absent: absentCount,
      noRecord: employeesWithoutAttendance,
      totalPresent,
      totalAbsent
    });

    const result = {
      success: true,
      data: {
        totalEmployees,
        presentToday: totalPresent,
        absentToday: totalAbsent,
        lateToday: lateCount,
        halfDayToday: halfDayCount,
        notMarkedCount: employeesWithoutAttendance,
        attendanceRate: totalEmployees > 0 ? ((totalPresent / totalEmployees) * 100).toFixed(1) : 0
      }
    };

    console.log('Final result:', result);
    res.json(result);
  } catch (error) {
    console.error('Get today summary error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching today summary' 
    });
  }
});

// Get attendance statistics
router.get('/stats/overview', async (req, res) => {
  try {
    console.log('Fetching stats overview...');
    
    const totalEmployees = await Employee.countDocuments();
    
    // **FIX: Use consistent date range**
    const { start, end } = getTodayDateRange();

    // Get today's attendance
    const todayAttendance = await Attendance.find({
      date: {
        $gte: start,
        $lt: end
      }
    });

    console.log('Total employees:', totalEmployees);
    console.log('Today attendance records:', todayAttendance.length);

    // Count statuses
    const presentCount = todayAttendance.filter(a => a.status === 'Present').length;
    const lateCount = todayAttendance.filter(a => a.status === 'Late').length;
    const halfDayCount = todayAttendance.filter(a => a.status === 'Half Day').length;
    const absentCount = todayAttendance.filter(a => a.status === 'Absent').length;

    // Calculate employees without attendance records
    const markedEmployees = todayAttendance.length;
    const notMarkedCount = totalEmployees - markedEmployees;

    // Total present (includes present, late, half day)
    const totalPresent = presentCount + lateCount + halfDayCount;
    // Total absent (includes marked absent + employees without records)
    const totalAbsent = absentCount + notMarkedCount;

    const result = {
      success: true,
      data: {
        totalEmployees,
        presentToday: totalPresent,
        absentToday: totalAbsent,
        lateToday: lateCount,
        halfDayToday: halfDayCount,
        notMarkedCount: notMarkedCount,
        attendanceRate: totalEmployees > 0 ? ((totalPresent / totalEmployees) * 100).toFixed(1) : 0
      }
    };

    console.log('Stats result:', result);
    res.json(result);
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching attendance statistics' 
    });
  }
});

// Mark attendance manually (for admin)
router.post('/mark', async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, employeeName, department } = req.body;
    
    // If employeeName and department are not provided, fetch from employee record
    let employeeData = {};
    if (!employeeName || !department) {
      const employee = await Employee.findOne({ employeeId });
      if (!employee) {
        return res.status(404).json({ 
          success: false,
          message: 'Employee not found' 
        });
      }
      employeeData.employeeName = employee.name;
      employeeData.department = employee.department;
    } else {
      employeeData.employeeName = employeeName;
      employeeData.department = department;
    }

    // **FIX: Use consistent date calculation for the date being marked**
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const tomorrowDate = new Date(attendanceDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: attendanceDate,
        $lt: tomorrowDate
      }
    });

    let attendance;
    const attendanceData = {
      employeeId,
      employeeName: employeeData.employeeName,
      date: attendanceDate,
      status,
      department: employeeData.department
    };

    if (checkIn) attendanceData.checkIn = new Date(checkIn);
    if (checkOut) attendanceData.checkOut = new Date(checkOut);

    if (existingAttendance) {
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        attendanceData,
        { new: true, runValidators: true }
      );
    } else {
      attendance = new Attendance(attendanceData);
      await attendance.save();
    }

    res.json({
      success: true,
      data: attendance,
      message: 'Attendance marked successfully'
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error marking attendance' 
    });
  }
});

// Update attendance record
router.put('/:id', async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut } = req.body;
    
    // **FIX: Use consistent date calculation for the date being updated**
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const tomorrowDate = new Date(attendanceDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const updateData = {
      date: attendanceDate,
      status
    };

    if (checkIn) updateData.checkIn = new Date(checkIn);
    if (checkOut) updateData.checkOut = new Date(checkOut);

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!attendance) {
      return res.status(404).json({ 
        success: false,
        message: 'Attendance record not found' 
      });
    }

    res.json({
      success: true,
      data: attendance,
      message: 'Attendance updated successfully'
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating attendance' 
    });
  }
});

// Delete attendance record by ID
router.delete('/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ 
        success: false,
        message: 'Attendance record not found' 
      });
    }

    res.json({
      success: true,
      message: 'Attendance record deleted successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting attendance record' 
    });
  }
});

// Delete attendance by employee ID
router.delete('/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const result = await Attendance.deleteMany({ employeeId });
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} attendance records for employee ${employeeId}`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting attendance records:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting attendance records' 
    });
  }
});

module.exports = router;