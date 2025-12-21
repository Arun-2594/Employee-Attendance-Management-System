// components/Dashboard.js
import React, { useState, useEffect } from "react";
import "./Dashboard.css";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    monthlyPay: 0,
    todayAttendance: "0%",
    attendanceStats: {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
    },
    leaveStats: {
      applied: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tooltip Component
  const Tooltip = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div 
        className="tooltip-container"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
        {isVisible && (
          <div className="tooltip">
            {content}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up event listeners for data changes
    const events = [
      "employeeAdded",
      "employeeUpdated",
      "employeeDeleted",
      "departmentAdded",
      "departmentUpdated",
      "departmentDeleted",
      "attendanceMarked",
      "attendanceUpdated",
      "leaveAdded",
      "leaveStatusUpdated",
      "salaryAdded",
    ];

    events.forEach((event) => {
      window.addEventListener(event, fetchDashboardData);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, fetchDashboardData);
      });
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError("");
      const token = localStorage.getItem("token");

      if (!token) {
        setError("No authentication token found");
        return;
      }

      // Fetch all data with error handling
      const [employeesRes, departmentsRes, attendanceRes, leavesRes] =
        await Promise.all([
          fetch("http://localhost:5000/api/employees", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch("http://localhost:5000/api/departments", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch("http://localhost:5000/api/attendance/today", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch("http://localhost:5000/api/leaves", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
        ]);

      // Check if responses are ok
      if (!employeesRes.ok) throw new Error("Failed to fetch employees");
      if (!departmentsRes.ok) throw new Error("Failed to fetch departments");
      if (!attendanceRes.ok) console.warn("Failed to fetch attendance data");
      if (!leavesRes.ok) console.warn("Failed to fetch leaves data");

      const employeesData = await employeesRes.json();
      const departmentsData = await departmentsRes.json();
      const attendanceData = attendanceRes.ok
        ? await attendanceRes.json()
        : { success: false, data: [] };
      const leavesData = leavesRes.ok
        ? await leavesRes.json()
        : { success: false, data: [] };

      // Validate data structure
      if (!employeesData.success || !departmentsData.success) {
        throw new Error("Invalid data received from server");
      }

      // Calculate statistics
      const totalEmployees = employeesData.data?.length || 0;
      const totalDepartments = departmentsData.data?.length || 0;

      // Calculate monthly pay safely
      const monthlyPay =
        employeesData.data?.reduce((total, employee) => {
          return total + (parseFloat(employee.salary) || 0);
        }, 0) || 0;

      // Calculate today's attendance
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let halfDayCount = 0;

      if (attendanceData.success && attendanceData.data) {
        attendanceData.data.forEach((record) => {
          if (record.status === "Present") presentCount++;
          else if (record.status === "Absent") absentCount++;
          else if (record.status === "Late") lateCount++;
          else if (record.status === "Half Day") halfDayCount++;
        });
      }

      // Calculate attendance rate
      const attendanceRate =
        totalEmployees > 0
          ? Math.round(
              ((presentCount + lateCount + halfDayCount) / totalEmployees) * 100
            )
          : 0;

      // Calculate leave statistics
      let appliedCount = 0;
      let approvedCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;

      if (leavesData.success && leavesData.data) {
        leavesData.data.forEach((leave) => {
          appliedCount++;
          if (leave.status === "Approved") approvedCount++;
          else if (leave.status === "Pending") pendingCount++;
          else if (leave.status === "Rejected") rejectedCount++;
        });
      }

      setDashboardData({
        totalEmployees,
        totalDepartments,
        monthlyPay,
        todayAttendance: `${attendanceRate}%`,
        attendanceStats: {
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          halfDay: halfDayCount,
        },
        leaveStats: {
          applied: appliedCount,
          approved: approvedCount,
          pending: pendingCount,
          rejected: rejectedCount,
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError(`Failed to load dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Quick action handlers
  const handleQuickAction = (action) => {
    switch (action) {
      case "markAttendance":
        window.dispatchEvent(new CustomEvent("showMarkAttendance"));
        break;
      case "addEmployee":
        window.dispatchEvent(new CustomEvent("showAddEmployee"));
        break;
      case "addDepartment":
        window.dispatchEvent(new CustomEvent("showAddDepartment"));
        break;
      case "manageLeaves":
        window.dispatchEvent(new CustomEvent("showApplyLeave"));
        break;
      case "processSalary":
        window.dispatchEvent(new CustomEvent("showAddSalary"));
        break;
      default:
        console.warn("Unknown action:", action);
    }
  };

  // Format numbers for display (compact)
  const formatNumberForDisplay = (number) => {
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M';
    }
    if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K';
    }
    return number.toString();
  };

  // Format currency for display (compact)
  const formatCurrencyForDisplay = (amount) => {
    if (amount >= 10000000) {
      return '₹' + (amount / 10000000).toFixed(1) + 'Cr';
    }
    if (amount >= 100000) {
      return '₹' + (amount / 100000).toFixed(1) + 'L';
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format full numbers for tooltips
  const formatFullNumber = (number) => {
    return number.toLocaleString();
  };

  const formatFullCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Dashboard Overview</h2>
          <div className="current-date">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <div className="current-date">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={fetchDashboardData} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Quick Actions Section */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons-grid">
          <button
            className="action-btn primary"
            onClick={() => handleQuickAction("markAttendance")}
          >
            📝 Mark Attendance
          </button>
          <button
            className="action-btn success"
            onClick={() => handleQuickAction("addEmployee")}
          >
            👥 Add Employee
          </button>
          <button
            className="action-btn secondary"
            onClick={() => handleQuickAction("addDepartment")}
          >
            🏢 Add Department
          </button>
          <button
            className="action-btn warning"
            onClick={() => handleQuickAction("manageLeaves")}
          >
            📋 Manage Leaves
          </button>
          <button
            className="action-btn primary"
            onClick={() => handleQuickAction("processSalary")}
          >
            💰 Process Salary
          </button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="stats-container">
        <div className="stat-card employee-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Employees</h3>
            <Tooltip content={`Full count: ${formatFullNumber(dashboardData.totalEmployees)}`}>
              <p className="stat-number">
                {formatNumberForDisplay(dashboardData.totalEmployees)}
              </p>
            </Tooltip>
            <div className="stat-trend">
              <span className="trend-up">↗ Active</span>
            </div>
          </div>
        </div>

        <div className="stat-card department-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <h3>Total Departments</h3>
            <Tooltip content={`Full count: ${formatFullNumber(dashboardData.totalDepartments)}`}>
              <p className="stat-number">
                {formatNumberForDisplay(dashboardData.totalDepartments)}
              </p>
            </Tooltip>
            <div className="stat-trend">
              <span className="trend-neutral">→ Stable</span>
            </div>
          </div>
        </div>

        <div className="stat-card salary-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Monthly Pay</h3>
            <Tooltip content={`Full amount: ${formatFullCurrency(dashboardData.monthlyPay)}`}>
              <p className="stat-number">
                {formatCurrencyForDisplay(dashboardData.monthlyPay)}
              </p>
            </Tooltip>
            <div className="stat-trend">
              <span className="trend-up">↗ Total</span>
            </div>
          </div>
        </div>

        <div className="stat-card attendance-card">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <h3>Today's Attendance</h3>
            <p className="stat-number">{dashboardData.todayAttendance}</p>
            <div className="stat-trend">
              <span className="trend-up">↗ Rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Attendance Summary - Box Layout */}
      <div className="attendance-overview">
        <h3>Today's Attendance Summary</h3>
        <div className="attendance-grid">
          <div className="attendance-box">
            <div className="attendance-header">
              <div className="attendance-icon">✅</div>
              <h4>Present</h4>
            </div>
            <div className="attendance-content">
              <Tooltip content={`Full count: ${formatFullNumber(dashboardData.attendanceStats.present)}`}>
                <p className="attendance-number present">
                  {formatNumberForDisplay(dashboardData.attendanceStats.present)}
                </p>
              </Tooltip>
              <div className="attendance-subtext">
                {dashboardData.totalEmployees > 0
                  ? Math.round(
                      (dashboardData.attendanceStats.present /
                        dashboardData.totalEmployees) *
                        100
                    )
                  : 0}
                % of employees
              </div>
            </div>
          </div>

          <div className="attendance-box">
            <div className="attendance-header">
              <div className="attendance-icon">❌</div>
              <h4>Absent</h4>
            </div>
            <div className="attendance-content">
              <Tooltip content={`Full count: ${formatFullNumber(dashboardData.attendanceStats.absent)}`}>
                <p className="attendance-number absent">
                  {formatNumberForDisplay(dashboardData.attendanceStats.absent)}
                </p>
              </Tooltip>
              <div className="attendance-subtext">
                {dashboardData.totalEmployees > 0
                  ? Math.round(
                      (dashboardData.attendanceStats.absent /
                        dashboardData.totalEmployees) *
                        100
                    )
                  : 0}
                % of employees
              </div>
            </div>
          </div>

          <div className="attendance-box">
            <div className="attendance-header">
              <div className="attendance-icon">⏰</div>
              <h4>Late</h4>
            </div>
            <div className="attendance-content">
              <Tooltip content={`Full count: ${formatFullNumber(dashboardData.attendanceStats.late)}`}>
                <p className="attendance-number late">
                  {formatNumberForDisplay(dashboardData.attendanceStats.late)}
                </p>
              </Tooltip>
              <div className="attendance-subtext">
                {dashboardData.attendanceStats.present > 0
                  ? Math.round(
                      (dashboardData.attendanceStats.late /
                        dashboardData.attendanceStats.present) *
                        100
                    )
                  : 0}
                % of present
              </div>
            </div>
          </div>

          <div className="attendance-box">
            <div className="attendance-header">
              <div className="attendance-icon">🕐</div>
              <h4>Half Day</h4>
            </div>
            <div className="attendance-content">
              <Tooltip content={`Full count: ${formatFullNumber(dashboardData.attendanceStats.halfDay)}`}>
                <p className="attendance-number half-day">
                  {formatNumberForDisplay(dashboardData.attendanceStats.halfDay)}
                </p>
              </Tooltip>
              <div className="attendance-subtext">
                {dashboardData.attendanceStats.present > 0
                  ? Math.round(
                      (dashboardData.attendanceStats.halfDay /
                        dashboardData.attendanceStats.present) *
                        100
                    )
                  : 0}
                % of present
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Management - Box Layout */}
      <div className="leave-stats">
        <h3>Leave Management</h3>
        <div className="leave-grid">
          <div className="leave-box">
            <div className="leave-header">
              <div className="leave-icon">📋</div>
              <h4>Leave Applied</h4>
            </div>
            <div className="leave-content">
              <Tooltip content={`Full count: ${formatFullNumber(dashboardData.leaveStats.applied)}`}>
                <p className="leave-number applied">
                  {formatNumberForDisplay(dashboardData.leaveStats.applied)}
                </p>
              </Tooltip>
              <div className="leave-subtext">Total applications</div>
            </div>
          </div>

          <div className="leave-box">
            <div className="leave-header">
              <div className="leave-icon">✅</div>
              <h4>Leave Approved</h4>
            </div>
            <div className="leave-content">
              <Tooltip content={`Full count: ${formatFullNumber(dashboardData.leaveStats.approved)}`}>
                <p className="leave-number approved">
                  {formatNumberForDisplay(dashboardData.leaveStats.approved)}
                </p>
              </Tooltip>
              <div className="leave-subtext">
                {dashboardData.leaveStats.applied > 0
                  ? Math.round(
                      (dashboardData.leaveStats.approved /
                        dashboardData.leaveStats.applied) *
                        100
                    )
                  : 0}
                % approval rate
              </div>
            </div>
          </div>

          <div className="leave-box">
            <div className="leave-header">
              <div className="leave-icon">⏳</div>
              <h4>Leave Pending</h4>
            </div>
            <div className="leave-content">
              <Tooltip content={`Full count: ${formatFullNumber(dashboardData.leaveStats.pending)}`}>
                <p className="leave-number pending">
                  {formatNumberForDisplay(dashboardData.leaveStats.pending)}
                </p>
              </Tooltip>
              <div className="leave-subtext">Awaiting review</div>
            </div>
          </div>

          <div className="leave-box">
            <div className="leave-header">
              <div className="leave-icon">❌</div>
              <h4>Leave Rejected</h4>
            </div>
            <div className="leave-content">
              <Tooltip content={`Full count: ${formatFullNumber(dashboardData.leaveStats.rejected)}`}>
                <p className="leave-number rejected">
                  {formatNumberForDisplay(dashboardData.leaveStats.rejected)}
                </p>
              </Tooltip>
              <div className="leave-subtext">
                {dashboardData.leaveStats.applied > 0
                  ? Math.round(
                      (dashboardData.leaveStats.rejected /
                        dashboardData.leaveStats.applied) *
                        100
                    )
                  : 0}
                % rejection rate
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;