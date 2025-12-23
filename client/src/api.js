import axios from "axios";

const API = axios.create({
  baseURL: "https://employee-attendance-management-system-7muj.onrender.com",
});

export default API;
