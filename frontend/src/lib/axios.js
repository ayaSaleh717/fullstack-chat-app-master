import axios from "axios";
const API_URL = 'http://localhost:3500/api/';

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,//send every cooki in every single request
});
