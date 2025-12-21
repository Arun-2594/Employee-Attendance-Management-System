// components/Settings.js
import React, { useState } from 'react';
import './Settings.css';

const Settings = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add password change logic here
  };

  return (
    <div className="settings">
      <h2>Settings</h2>
      
      <div className="settings-content">
        <h3>Change Password</h3>
        <form onSubmit={handleSubmit} className="password-form">
          <div className="form-group">
            <label>Old Password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="change-password-btn">
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;