// server/seedData.js
const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const Employee = require('./models/Employee');
require('dotenv').config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Clear existing data
    await User.deleteMany({});
    await Department.deleteMany({});
    await Employee.deleteMany({});

    // Create admin user
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@company.com',
      password: 'admin123',
      role: 'admin'
    });
    await adminUser.save();

    // Create departments
    const departments = [
      { name: 'IT', description: 'Information Technology Department' },
      { name: 'Database', description: 'Database Management Department' },
      { name: 'Logistic', description: 'Logistics and Supply Chain Department' },
      { name: 'HR', description: 'Human Resources Department' },
      { name: 'Finance', description: 'Finance and Accounting Department' }
    ];

    for (const dept of departments) {
      const department = new Department(dept);
      await department.save();
    }

    // Create sample employees
    const employees = [
      {
        name: 'yousaf',
        employeeId: 'empf11',
        email: 'yousaf@company.com',
        password: 'password123',
        gender: 'male',
        designation: 'Software Engineer',
        salary: 50000,
        dateOfBirth: new Date('2007-02-13'),
        maritalStatus: 'single',
        department: 'Logistic'
      },
      {
        name: 'asif',
        employeeId: 'asif113',
        email: 'asif@company.com',
        password: 'password123',
        gender: 'male',
        designation: 'Database Administrator',
        salary: 45000,
        dateOfBirth: new Date('2022-06-29'),
        maritalStatus: 'single',
        department: 'Database'
      },
      {
        name: 'khaili',
        employeeId: 'khaili001',
        email: 'khaili@company.com',
        password: 'password123',
        gender: 'female',
        designation: 'Data Analyst',
        salary: 42000,
        dateOfBirth: new Date('2021-06-15'),
        maritalStatus: 'married',
        department: 'Database'
      },
      {
        name: 'Latif',
        employeeId: 'latif002',
        email: 'latif@company.com',
        password: 'password123',
        gender: 'male',
        designation: 'IT Support',
        salary: 38000,
        dateOfBirth: new Date('2020-06-09'),
        maritalStatus: 'single',
        department: 'IT'
      },
      {
        name: 'musa',
        employeeId: 'musa003',
        email: 'musa@company.com',
        password: 'password123',
        gender: 'male',
        designation: 'Network Engineer',
        salary: 52000,
        dateOfBirth: new Date('2010-06-16'),
        maritalStatus: 'married',
        department: 'IT'
      }
    ];

    for (const emp of employees) {
      const employee = new Employee(emp);
      await employee.save();
    }

    console.log('Database seeded successfully!');
    console.log('Admin credentials:');
    console.log('Email: admin@company.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();