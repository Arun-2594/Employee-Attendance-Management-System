import axios from "axios";

const API = axios.create({
  baseURL: "https://employee-attendance-management-system-w9ea.onrender.com",
  headers: {
    "Content-Type": "application/json"
  }
});

export default API;
