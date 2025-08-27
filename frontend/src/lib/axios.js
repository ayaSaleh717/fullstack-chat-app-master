import axios from "axios";
const API_URL = 'https://chat-app-backnd.onrender.com';

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,//send every cooki in every single request
});
