// models/Leave.js
const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    trim: true
  },
  employeeName: {
    type: String,
    required: true,
    trim: true
  },
  leaveType: {
    type: String,
    enum: ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Maternity Leave', 'Paternity Leave', 'Emergency Leave'],
    required: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  days: {
    type: Number,
    required: true,
    min: 1
  },
  approvedBy: {
    type: String,
    default: null,
    trim: true
  },
  approvedDate: {
    type: Date,
    default: null
  },
  comments: {
    type: String,
    default: '',
    trim: true,
    maxlength: 200
  }
}, {
  timestamps: true
});

// Indexes for better performance
leaveSchema.index({ employeeId: 1, appliedDate: -1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ department: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if leave is active
leaveSchema.virtual('isActive').get(function() {
  const today = new Date();
  return this.startDate <= today && this.endDate >= today && this.status === 'Approved';
});

// Method to check date conflict
leaveSchema.methods.hasDateConflict = async function() {
  const conflictingLeave = await mongoose.model('Leave').findOne({
    employeeId: this.employeeId,
    status: { $in: ['Pending', 'Approved'] },
    _id: { $ne: this._id },
    $or: [
      { startDate: { $lte: this.endDate }, endDate: { $gte: this.startDate } }
    ]
  });
  return conflictingLeave;
};

module.exports = mongoose.model('Leave', leaveSchema);