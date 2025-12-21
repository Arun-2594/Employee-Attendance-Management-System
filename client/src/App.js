// src/App.js
import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import EmployeeManagement from "./components/EmployeeManagement";
import DepartmentManagement from "./components/DepartmentManagement";
import LeaveManagement from "./components/LeaveManagement";
import SalaryManagement from "./components/SalaryManagement";
import Settings from "./components/Settings";
import Attendance from "./components/Attendance";
import ApplyLeave from "./components/ApplyLeave";
import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Handle quick actions from dashboard
  useEffect(() => {
    const handleQuickActions = (event) => {
      switch (event.type) {
        case "showMarkAttendance":
          setCurrentView("attendance");
          break;
        case "showAddEmployee":
          setCurrentView("employees");
          break;
        case "showAddDepartment":
          setCurrentView("departments");
          break;
        case "showAddSalary":
          setCurrentView("salary");
          break;
        case "showApplyLeave":
          setCurrentView("apply-leave");
          break;
        default:
          break;
      }
    };

    window.addEventListener("showMarkAttendance", handleQuickActions);
    window.addEventListener("showAddEmployee", handleQuickActions);
    window.addEventListener("showAddDepartment", handleQuickActions);
    window.addEventListener("showAddSalary", handleQuickActions);
    window.addEventListener("showApplyLeave", handleQuickActions);

    return () => {
      window.removeEventListener("showMarkAttendance", handleQuickActions);
      window.removeEventListener("showAddEmployee", handleQuickActions);
      window.removeEventListener("showAddDepartment", handleQuickActions);
      window.removeEventListener("showAddSalary", handleQuickActions);
      window.removeEventListener("showApplyLeave", handleQuickActions);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const response = await fetch("http://localhost:5000/api/auth/check", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (data.success && data.authenticated) {
          setIsLoggedIn(true);
          setUser(data.user);
        } else {
          localStorage.removeItem("token");
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem("token", token);
    setIsLoggedIn(true);
    setUser(userData);
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUser(null);
    setCurrentView("dashboard");
  };

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "employees":
        return <EmployeeManagement />;
      case "departments":
        return <DepartmentManagement />;
      case "attendance":
        return <Attendance />;
      case "leaves":
        return <LeaveManagement />;
      case "apply-leave":
        return <ApplyLeave />;
      case "salary":
        return <SalaryManagement />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Employee Attendance Management System...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div className="app-container">
          <header className="app-header">
            <h1>Employee Attendance Management System</h1>
            <div className="user-info">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user?.name || "Admin"} 
                  className="user-avatar"
                />
              ) : (
                <div className="user-avatar-placeholder">
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
              )}
              <span className="user-name">Welcome, {user?.name || "Admin"}</span>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          </header>

          <nav className="sidebar">
            <ul>
              <li
                className={currentView === "dashboard" ? "active" : ""}
                onClick={() => setCurrentView("dashboard")}
              >
                📊 Dashboard
              </li>
              <li
                className={currentView === "employees" ? "active" : ""}
                onClick={() => setCurrentView("employees")}
              >
                👥 Employees
              </li>
              <li
                className={currentView === "departments" ? "active" : ""}
                onClick={() => setCurrentView("departments")}
              >
                🏢 Departments
              </li>
              <li
                className={currentView === "attendance" ? "active" : ""}
                onClick={() => setCurrentView("attendance")}
              >
                ⏰ Attendance
              </li>
              <li
                className={currentView === "leaves" ? "active" : ""}
                onClick={() => setCurrentView("leaves")}
              >
                📋 Manage Leaves
              </li>
              <li
                className={currentView === "apply-leave" ? "active" : ""}
                onClick={() => setCurrentView("apply-leave")}
              >
                📝 Apply Leave
              </li>
              <li
                className={currentView === "salary" ? "active" : ""}
                onClick={() => setCurrentView("salary")}
              >
                💰 Salary
              </li>
              <li
                className={currentView === "settings" ? "active" : ""}
                onClick={() => setCurrentView("settings")}
              >
                ⚙️ Settings
              </li>
            </ul>
          </nav>

          <main className="main-content">
            {renderView()}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;